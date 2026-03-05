const Notification = require('../models/Notification');
const User = require('../models/User');
const { success, error } = require('../utils/responseHelper');

exports.getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, unreadOnly } = req.query;
    const query = {};
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .populate('customer', 'name phone')
      .populate('policy', 'policyNumber')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({ isRead: false });
    success(res, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) return error(res, 'Notification not found', 404);
    success(res, notification);
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    success(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

exports.savePushSubscription = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      pushSubscription: req.body.subscription,
    });
    success(res, { message: 'Push subscription saved' });
  } catch (err) {
    next(err);
  }
};
