const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const customerSelect = { id: true, name: true, phone: true, email: true };

// ── Helpers: recalculate dueDate & apply payments FIFO across chunks ────────

function recalculateDueDate(credit) {
  const chunks = (credit.transactions || [])
    .filter((t) => t.type === 'credit' || t.type === 'topup')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  for (const chunk of chunks) {
    if ((chunk.paidAmount || 0) < chunk.amount) {
      credit.dueDate = chunk.dueDate;
      return;
    }
  }
  // All chunks paid — keep last due date
  if (chunks.length > 0) {
    credit.dueDate = chunks[chunks.length - 1].dueDate;
  }
}

function applyPaymentFIFO(credit, amount) {
  let remaining = amount;
  const chunks = (credit.transactions || [])
    .filter((t) => t.type === 'credit' || t.type === 'topup')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  for (const chunk of chunks) {
    if (remaining <= 0) break;
    const unpaid = chunk.amount - (chunk.paidAmount || 0);
    if (unpaid <= 0) continue;
    const pay = Math.min(remaining, unpaid);
    chunk.paidAmount = (chunk.paidAmount || 0) + pay;
    remaining -= pay;
  }
}

// GET /api/credits
exports.getCredits = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    if (status === 'open' || status === 'closed') {
      where.status = status;
    }
    if (status === 'overdue') {
      where.status = 'open';
      where.dueDate = { lt: new Date() };
    }

    let credits, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await prisma.credit.findMany({
        where,
        include: { customer: { select: customerSelect } },
        orderBy: { dueDate: 'asc' },
      });
      const filtered = all.filter(
        (c) =>
          searchRegex.test(c.customer?.name) ||
          searchRegex.test(c.customer?.phone) ||
          searchRegex.test(c.reason)
      );
      total = filtered.length;
      credits = filtered.slice(skip, skip + Number(limit));
    } else {
      [credits, total] = await Promise.all([
        prisma.credit.findMany({
          where,
          include: { customer: { select: customerSelect } },
          orderBy: { dueDate: 'asc' },
          skip,
          take: Number(limit),
        }),
        prisma.credit.count({ where }),
      ]);
    }

    paginated(res, { docs: many(credits), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/credits/:id
exports.getCredit = async (req, res, next) => {
  try {
    const credit = await prisma.credit.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: customerSelect } },
    });
    if (!credit) return error(res, 'Credit not found', 404);
    success(res, one(credit));
  } catch (err) {
    next(err);
  }
};

// GET /api/credits/customer/:customerId — all credits for a customer
exports.getCreditsByCustomer = async (req, res, next) => {
  try {
    const credits = await prisma.credit.findMany({
      where: { customerId: req.params.customerId },
      include: { customer: { select: customerSelect } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    success(res, many(credits));
  } catch (err) {
    next(err);
  }
};

// POST /api/credits
exports.createCredit = async (req, res, next) => {
  try {
    const { customer, reason, totalAmount, dueDate, notes } = req.body;
    const credit = await prisma.credit.create({
      data: {
        customerId: customer,
        reason,
        totalAmount,
        balanceAmount: totalAmount,
        dueDate,
        status: 'open',
        notes,
        transactions: [
          { type: 'credit', amount: totalAmount, dueDate, paidAmount: 0, notes: 'Initial credit', date: new Date() },
        ],
        createdById: req.user.id,
      },
    });

    const populated = await prisma.credit.findUnique({
      where: { id: credit.id },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(populated), 201);
  } catch (err) {
    next(err);
  }
};
// PUT /api/credits/:id/topup
exports.topupCredit = async (req, res, next) => {
  try {
    const { amount, dueDate, notes } = req.body;
    const credit = await prisma.credit.findUnique({ where: { id: req.params.id } });
    if (!credit) return error(res, 'Credit not found', 404);
    if (credit.status === 'closed') return error(res, 'Cannot top-up a closed credit', 400);

    credit.totalAmount += amount;
    credit.balanceAmount += amount;
    credit.transactions = credit.transactions || [];
    credit.transactions.push({
      type: 'topup',
      amount,
      dueDate: dueDate || credit.dueDate,
      paidAmount: 0,
      notes: notes || 'Top-up',
      date: new Date(),
    });

    recalculateDueDate(credit);
    const updated = await prisma.credit.update({
      where: { id: credit.id },
      data: { totalAmount: credit.totalAmount, balanceAmount: credit.balanceAmount, dueDate: credit.dueDate, transactions: credit.transactions },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// PUT /api/credits/:id/payment
exports.paymentCredit = async (req, res, next) => {
  try {
    const { amount, notes } = req.body;
    const credit = await prisma.credit.findUnique({ where: { id: req.params.id } });
    if (!credit) return error(res, 'Credit not found', 404);
    if (credit.status === 'closed') return error(res, 'Credit is already closed', 400);
    if (amount > credit.balanceAmount) return error(res, 'Payment amount exceeds balance', 400);

    // Apply payment FIFO to chunks
    applyPaymentFIFO(credit, amount);

    credit.balanceAmount -= amount;
    credit.transactions = credit.transactions || [];
    credit.transactions.push({ type: 'payment', amount, notes: notes || 'Payment', date: new Date() });

    if (credit.balanceAmount <= 0) {
      credit.balanceAmount = 0;
      credit.status = 'closed';
    }

    // Recalculate active dueDate (shifts to next unpaid chunk)
    recalculateDueDate(credit);
    const updated = await prisma.credit.update({
      where: { id: credit.id },
      data: { balanceAmount: credit.balanceAmount, status: credit.status, dueDate: credit.dueDate, transactions: credit.transactions },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// PUT /api/credits/:id/close
exports.closeCredit = async (req, res, next) => {
  try {
    const credit = await prisma.credit.findUnique({ where: { id: req.params.id } });
    if (!credit) return error(res, 'Credit not found', 404);

    credit.status = 'closed';
    credit.transactions = credit.transactions || [];
    credit.transactions.push({
      type: 'payment',
      amount: credit.balanceAmount,
      notes: 'Force closed',
      date: new Date(),
    });

    // Mark all chunks as fully paid
    credit.transactions.forEach((t) => {
      if (t.type === 'credit' || t.type === 'topup') {
        t.paidAmount = t.amount;
      }
    });

    credit.balanceAmount = 0;

    const updated = await prisma.credit.update({
      where: { id: credit.id },
      data: { status: credit.status, balanceAmount: 0, transactions: credit.transactions },
      include: { customer: { select: customerSelect } },
    });
    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/credits/:id
exports.deleteCredit = async (req, res, next) => {
  try {
    const credit = await prisma.credit.delete({ where: { id: req.params.id } });
    if (!credit) return error(res, 'Credit not found', 404);
    success(res, { message: 'Credit deleted' });
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Credit not found', 404);
    next(err);
  }
};