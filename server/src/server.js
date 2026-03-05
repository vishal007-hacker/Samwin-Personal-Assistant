const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const { startReminderService } = require('./services/reminderService');

const start = async () => {
  await connectDB();
  startReminderService();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

start();
