const prisma = require('../config/prisma');
const { success, paginated, error } = require('../utils/responseHelper');
const { many, one } = require('../utils/prismaSerializer');

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, unreadOnly } = req.query;
    const where = {};
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          policy: { select: { id: true, policyNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    success(res, { notifications: many(notifications), unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    if (!notification) return error(res, 'Notification not found', 404);
    success(res, one(notification));
  } catch (err) {
    if (err.code === 'P2025') return error(res, 'Notification not found', 404);
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    success(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

exports.savePushSubscription = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushSubscription: req.body.subscription },
    });
    success(res, { message: 'Push subscription saved' });
  } catch (err) {
    next(err);
  }
};