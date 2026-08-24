const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

const manageInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  scheme: { select: { id: true, name: true, type: true, company: true } },
};

// GET /api/reminders - List all active policies with reminder info
exports.getReminders = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', filter = 'all' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { status: 'active' };
    const now = new Date();

    // Filter by reminder timing
    if (filter === 'overdue') {
      where.nextPremiumDate = { lt: now };
    } else if (filter === 'upcoming') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      where.nextPremiumDate = { gte: now, lte: thirtyDays };
    } else if (filter === 'expiring') {
      const sixtyDays = new Date();
      sixtyDays.setDate(sixtyDays.getDate() + 60);
      where.maturityDate = { gte: now, lte: sixtyDays };
    }

    let policies, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const allPolicies = await prisma.policy.findMany({
        where,
        include: manageInclude,
        orderBy: { nextPremiumDate: 'asc' },
      });

      const filtered = allPolicies.filter(
        (p) =>
          searchRegex.test(p.customer?.name) ||
          searchRegex.test(p.customer?.phone) ||
          searchRegex.test(p.policyNumber) ||
          searchRegex.test(p.scheme?.name) ||
          searchRegex.test(p.scheme?.type)
      );

      total = filtered.length;
      policies = filtered.slice(skip, skip + Number(limit));
    } else {
      [policies, total] = await Promise.all([
        prisma.policy.findMany({
          where,
          include: manageInclude,
          orderBy: { nextPremiumDate: 'asc' },
          skip,
          take: Number(limit),
        }),
        prisma.policy.count({ where }),
      ]);
    }

    paginated(res, { docs: many(policies), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/reminders/:id/settings - Update reminder settings for a policy
exports.updateReminderSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reminderSettings } = req.body;

    const policy = await prisma.policy.findUnique({ where: { id } });
    if (!policy) {
      return error(res, 'Policy not found', 404);
    }

    const settings = {
      oneMonthBefore: !!reminderSettings?.oneMonthBefore,
      tenDaysBefore: !!reminderSettings?.tenDaysBefore,
      fiveDaysBefore: !!reminderSettings?.fiveDaysBefore,
      oneDayBefore: !!reminderSettings?.oneDayBefore,
    };

    const updated = await prisma.policy.update({
      where: { id },
      data: { reminderSettings: settings },
      include: manageInclude,
    });

    success(res, one(updated));
  } catch (err) {
    next(err);
  }
};

// POST /api/reminders/:id/send-whatsapp - Generate WhatsApp reminder info
exports.sendWhatsAppReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        scheme: { select: { id: true, name: true, type: true } },
      },
    });

    if (!policy) {
      return error(res, 'Policy not found', 404);
    }

    if (!policy.customer?.phone) {
      return error(res, 'Customer phone number not available', 400);
    }

    const dueDate = policy.nextPremiumDate
      ? new Date(policy.nextPremiumDate).toLocaleDateString('en-IN')
      : 'N/A';

    const isOverdue = policy.nextPremiumDate && new Date(policy.nextPremiumDate) < new Date();

    let message;
    if (isOverdue) {
      message = `Dear ${policy.customer.name},\n\nYour insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${policy.scheme?.name || ''}) was due on ${dueDate} and is now overdue.\n\nPlease make the payment immediately to avoid policy lapse.\n\nThank you,\nSamwin Infotech`;
    } else {
      message = `Dear ${policy.customer.name},\n\nThis is a reminder that your insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${policy.scheme?.name || ''}) is due on ${dueDate}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;
    }

    // Log notification
    await prisma.notification.create({
      data: {
        type: isOverdue ? 'overdue_alert' : 'premium_reminder',
        policyId: policy.id,
        customerId: policy.customer && policy.customer.id,
        message: `WhatsApp reminder sent to ${policy.customer.name} for policy ${policy.policyNumber}`,
        channels: { whatsapp: { sent: true } },
      },
    });

    let phone = policy.customer.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    success(res, {
      phone,
      message,
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    });
  } catch (err) {
    next(err);
  }
};