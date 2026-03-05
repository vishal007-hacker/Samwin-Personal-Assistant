const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { success, error } = require('../utils/responseHelper');

const generateToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: jwtExpiresIn });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return error(res, 'Email and password are required', 400);
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account is deactivated', 401);
    }

    const token = generateToken(user._id);
    success(res, { token, user });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return error(res, 'Email already registered', 400);
    }

    const user = await User.create({ name, email, password, role, phone });
    const token = generateToken(user._id);
    success(res, { token, user }, 201);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  success(res, req.user);
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      return error(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();
    success(res, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
