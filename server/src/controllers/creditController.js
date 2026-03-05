const Credit = require('../models/Credit');
const { success, paginated, error } = require('../utils/responseHelper');

// ── Helper: recalculate credit's dueDate to earliest unpaid chunk ────────────

function recalculateDueDate(credit) {
  const chunks = credit.transactions
    .filter(t => t.type === 'credit' || t.type === 'topup')
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

// ── Helper: apply payment FIFO across chunks (earliest dueDate first) ────────

function applyPaymentFIFO(credit, amount) {
  let remaining = amount;
  const chunks = credit.transactions
    .filter(t => t.type === 'credit' || t.type === 'topup')
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
    const query = {};

    if (status === 'open' || status === 'closed') {
      query.status = status;
    }
    if (status === 'overdue') {
      query.status = 'open';
      query.dueDate = { $lt: new Date() };
    }

    let credits, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const all = await Credit.find(query)
        .populate('customer', 'name phone email')
        .sort({ dueDate: 1 });
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
        Credit.find(query)
          .populate('customer', 'name phone email')
          .sort({ dueDate: 1 })
          .skip(skip)
          .limit(Number(limit)),
        Credit.countDocuments(query),
      ]);
    }

    paginated(res, { docs: credits, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/credits/:id
exports.getCredit = async (req, res, next) => {
  try {
    const credit = await Credit.findById(req.params.id)
      .populate('customer', 'name phone email');
    if (!credit) return error(res, 'Credit not found', 404);
    success(res, credit);
  } catch (err) {
    next(err);
  }
};

// GET /api/credits/customer/:customerId — all credits for a customer
exports.getCreditsByCustomer = async (req, res, next) => {
  try {
    const credits = await Credit.find({ customer: req.params.customerId })
      .populate('customer', 'name phone email')
      .sort({ status: 1, dueDate: 1 });
    success(res, credits);
  } catch (err) {
    next(err);
  }
};

// POST /api/credits
exports.createCredit = async (req, res, next) => {
  try {
    const { customer, reason, totalAmount, dueDate, notes } = req.body;

    // Block duplicate — one open credit per customer
    const existingCredit = await Credit.findOne({ customer, status: 'open' })
      .populate('customer', 'name phone email');
    if (existingCredit) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'Customer already has an open credit. Please top-up instead.',
        existingCredit,
      });
    }

    const credit = await Credit.create({
      customer,
      reason,
      totalAmount,
      balanceAmount: totalAmount,
      dueDate,
      notes,
      createdBy: req.user._id,
      transactions: [
        { type: 'credit', amount: totalAmount, dueDate, paidAmount: 0, notes: 'Initial credit', date: new Date() },
      ],
    });

    await credit.populate('customer', 'name phone email');
    success(res, credit, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/credits/:id/topup
exports.topupCredit = async (req, res, next) => {
  try {
    const { amount, dueDate, notes } = req.body;
    const credit = await Credit.findById(req.params.id);
    if (!credit) return error(res, 'Credit not found', 404);
    if (credit.status === 'closed') return error(res, 'Cannot top-up a closed credit', 400);

    credit.totalAmount += amount;
    credit.balanceAmount += amount;
    credit.transactions.push({
      type: 'topup',
      amount,
      dueDate: dueDate || credit.dueDate,
      paidAmount: 0,
      notes: notes || 'Top-up',
      date: new Date(),
    });

    // Recalculate active dueDate (earliest unpaid chunk)
    recalculateDueDate(credit);
    await credit.save();
    await credit.populate('customer', 'name phone email');
    success(res, credit);
  } catch (err) {
    next(err);
  }
};

// PUT /api/credits/:id/payment
exports.paymentCredit = async (req, res, next) => {
  try {
    const { amount, notes } = req.body;
    const credit = await Credit.findById(req.params.id);
    if (!credit) return error(res, 'Credit not found', 404);
    if (credit.status === 'closed') return error(res, 'Credit is already closed', 400);
    if (amount > credit.balanceAmount) return error(res, 'Payment amount exceeds balance', 400);

    // Apply payment FIFO to chunks
    applyPaymentFIFO(credit, amount);

    credit.balanceAmount -= amount;
    credit.transactions.push({ type: 'payment', amount, notes: notes || 'Payment', date: new Date() });

    if (credit.balanceAmount <= 0) {
      credit.balanceAmount = 0;
      credit.status = 'closed';
    }

    // Recalculate active dueDate (shifts to next unpaid chunk)
    recalculateDueDate(credit);
    credit.markModified('transactions');
    await credit.save();
    await credit.populate('customer', 'name phone email');
    success(res, credit);
  } catch (err) {
    next(err);
  }
};

// PUT /api/credits/:id/close
exports.closeCredit = async (req, res, next) => {
  try {
    const credit = await Credit.findById(req.params.id);
    if (!credit) return error(res, 'Credit not found', 404);

    credit.status = 'closed';
    credit.transactions.push({
      type: 'payment',
      amount: credit.balanceAmount,
      notes: 'Force closed',
      date: new Date(),
    });

    // Mark all chunks as fully paid
    credit.transactions.forEach(t => {
      if (t.type === 'credit' || t.type === 'topup') {
        t.paidAmount = t.amount;
      }
    });

    credit.balanceAmount = 0;
    credit.markModified('transactions');
    await credit.save();
    await credit.populate('customer', 'name phone email');
    success(res, credit);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/credits/:id
exports.deleteCredit = async (req, res, next) => {
  try {
    const credit = await Credit.findByIdAndDelete(req.params.id);
    if (!credit) return error(res, 'Credit not found', 404);
    success(res, { message: 'Credit deleted' });
  } catch (err) {
    next(err);
  }
};
