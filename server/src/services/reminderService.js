const cron = require('node-cron');
const Policy = require('../models/Policy');
const Credit = require('../models/Credit');
const Notification = require('../models/Notification');

const checkReminders = async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Find all active policies with upcoming or overdue premiums
    const sixtyDaysLater = new Date(now);
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 35);

    const policies = await Policy.find({
      status: 'active',
      nextPremiumDate: { $lte: sixtyDaysLater },
    }).populate('customer', 'name phone');

    let upcomingCount = 0;
    let overdueCount = 0;

    for (const policy of policies) {
      if (!policy.nextPremiumDate) continue;

      const dueDate = new Date(policy.nextPremiumDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60 * 24));

      const settings = policy.reminderSettings || {
        oneMonthBefore: true,
        tenDaysBefore: true,
        fiveDaysBefore: true,
        oneDayBefore: true,
      };

      // Check if we should send a reminder based on settings
      let shouldRemind = false;
      let reminderType = 'premium_reminder';

      if (daysUntilDue < 0) {
        // Overdue
        overdueCount++;
        reminderType = 'overdue_alert';
        shouldRemind = true;
      } else {
        upcomingCount++;
        if (daysUntilDue <= 1 && settings.oneDayBefore) shouldRemind = true;
        else if (daysUntilDue <= 5 && settings.fiveDaysBefore) shouldRemind = true;
        else if (daysUntilDue <= 10 && settings.tenDaysBefore) shouldRemind = true;
        else if (daysUntilDue <= 30 && settings.oneMonthBefore) shouldRemind = true;
      }

      if (!shouldRemind) continue;

      // Check if notification already exists for today
      const todayStart = new Date(now);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const existing = await Notification.findOne({
        policy: policy._id,
        type: reminderType,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      });

      if (existing) continue;

      const dueDateStr = dueDate.toLocaleDateString('en-IN');
      const customerName = policy.customer?.name || 'Customer';
      const prefix = reminderType === 'overdue_alert' ? 'OVERDUE: ' : '';

      await Notification.create({
        type: reminderType,
        policy: policy._id,
        customer: policy.customer?._id,
        message: `${prefix}Premium of Rs.${policy.premiumAmount} due on ${dueDateStr} for policy ${policy.policyNumber} - ${customerName}`,
        scheduledFor: policy.nextPremiumDate,
      });
    }

    console.log(`Reminder check complete: ${upcomingCount} upcoming, ${overdueCount} overdue`);

    // --- Credit overdue check ---
    const overdueCredits = await Credit.find({
      status: 'open',
      dueDate: { $lt: now },
    }).populate('customer', 'name phone');

    let creditOverdueCount = 0;
    for (const credit of overdueCredits) {
      const todayStart = new Date(now);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const existing = await Notification.findOne({
        type: 'credit_overdue',
        customer: credit.customer?._id,
        message: { $regex: credit._id.toString() },
        createdAt: { $gte: todayStart, $lte: todayEnd },
      });

      if (!existing) {
        const dueDateStr = credit.dueDate.toLocaleDateString('en-IN');
        const customerName = credit.customer?.name || 'Customer';
        await Notification.create({
          type: 'credit_overdue',
          customer: credit.customer?._id,
          message: `CREDIT OVERDUE: Rs.${credit.balanceAmount} from ${customerName} was due on ${dueDateStr} (Ref: ${credit._id})`,
          scheduledFor: credit.dueDate,
        });
        creditOverdueCount++;
      }
    }
    if (creditOverdueCount > 0) {
      console.log(`Credit overdue notifications: ${creditOverdueCount}`);
    }
  } catch (err) {
    console.error('Reminder service error:', err);
  }
};

const startReminderService = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', checkReminders);
  console.log('Reminder service started (runs daily at 9:00 AM)');

  // Also run on startup
  checkReminders();
};

module.exports = { startReminderService, checkReminders };
