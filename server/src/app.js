const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { clientUrl } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many attempts, try again after 15 minutes' },
});

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploaded documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/schemes', require('./routes/schemeRoutes'));
app.use('/api/policies', require('./routes/policyRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/credits', require('./routes/creditRoutes'));
app.use('/api/broadcast', require('./routes/broadcastRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Samwin Infotech API is running' });
});

// Serve React build in production
const clientBuild = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuild));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// Error handler
app.use(errorHandler);

module.exports = app;
