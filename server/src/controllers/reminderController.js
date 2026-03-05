const Policy = require('../models/Policy');
const Notification = require('../models/Notification');
const { success, paginated, error } = require('../utils/responseHelper');

// GET /api/reminders - List all active policies with reminder info
exports.getReminders = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', filter = 'all' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { status: 'active' };
    const now = new Date();

    // Filter by reminder timing
    if (filter === 'overdue') {
      query.nextPremiumDate = { $lt: now };
    } else if (filter === 'upcoming') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      query.nextPremiumDate = { $gte: now, $lte: thirtyDays };
    } else if (filter === 'expiring') {
      const sixtyDays = new Date();
      sixtyDays.setDate(sixtyDays.getDate() + 60);
      query.maturityDate = { $gte: now, $lte: sixtyDays };
    }

    // Build aggregation for search across populated fields
    let policies, total;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const allPolicies = await Policy.find(query)
        .populate('customer', 'name phone email')
        .populate('scheme', 'name type company')
        .sort({ nextPremiumDate: 1 });

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
        Policy.find(query)
          .populate('customer', 'name phone email')
          .populate('scheme', 'name type company')
          .sort({ nextPremiumDate: 1 })
          .skip(skip)
          .limit(Number(limit)),
        Policy.countDocuments(query),
      ]);
    }

    paginated(res, { docs: policies, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/reminders/:id/settings - Update reminder settings for a policy
exports.updateReminderSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reminderSettings } = req.body;

    const policy = await Policy.findById(id);
    if (!policy) {
      return error(res, 'Policy not found', 404);
    }

    policy.reminderSettings = {
      oneMonthBefore: !!reminderSettings?.oneMonthBefore,
      tenDaysBefore: !!reminderSettings?.tenDaysBefore,
      fiveDaysBefore: !!reminderSettings?.fiveDaysBefore,
      oneDayBefore: !!reminderSettings?.oneDayBefore,
    };

    await policy.save();
    await policy.populate('customer', 'name phone email');
    await policy.populate('scheme', 'name type company');

    success(res, policy);
  } catch (err) {
    next(err);
  }
};

// POST /api/reminders/:id/send-whatsapp - Generate WhatsApp reminder info
exports.sendWhatsAppReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id)
      .populate('customer', 'name phone')
      .populate('scheme', 'name type');

    if (!policy) {
      return error(res, 'Policy not found', 404);
    }

    if (!policy.customer?.phone) {
      return error(res, 'Customer phone number not available', 400);
    }

    const dueDate = policy.nextPremiumDate
      ? policy.nextPremiumDate.toLocaleDateString('en-IN')
      : 'N/A';

    const isOverdue = policy.nextPremiumDate && policy.nextPremiumDate < new Date();

    let message;
    if (isOverdue) {
      message = `Dear ${policy.customer.name},\n\nYour insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${policy.scheme?.name || ''}) was due on ${dueDate} and is now overdue.\n\nPlease make the payment immediately to avoid policy lapse.\n\nThank you,\nSamwin Infotech`;
    } else {
      message = `Dear ${policy.customer.name},\n\nThis is a reminder that your insurance premium of Rs.${policy.premiumAmount} for policy ${policy.policyNumber} (${policy.scheme?.name || ''}) is due on ${dueDate}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nSamwin Infotech`;
    }

    // Log notification
    await Notification.create({
      type: isOverdue ? 'overdue_alert' : 'premium_reminder',
      policy: policy._id,
      customer: policy.customer._id,
      message: `WhatsApp reminder sent to ${policy.customer.name} for policy ${policy.policyNumber}`,
      channels: { whatsapp: true },
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
