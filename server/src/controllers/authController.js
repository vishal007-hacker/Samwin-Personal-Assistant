const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { success, error } = require('../utils/responseHelper');
const { one } = require('../utils/prismaSerializer');

const generateToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpiresIn });

// Never expose password / pushSubscription (replaces Mongoose toJSON).
const sanitizeUser = (user) => {
  if (!user) return user;
  const { password, pushSubscription, ...safe } = user;
  return safe;
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return error(res, 'Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account is deactivated', 401);
    }

    const token = generateToken(user.id);
    success(res, { token, user: one(sanitizeUser(user)) });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error(res, 'Email already registered', 400);
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, phone },
    });
    const token = generateToken(user.id);
    success(res, { token, user: one(sanitizeUser(user)) }, 201);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  success(res, one(req.user));
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return error(res, 'Current password is incorrect', 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    success(res, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
