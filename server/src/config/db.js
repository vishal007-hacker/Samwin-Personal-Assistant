const prisma = require('./prisma');

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL Connected (Prisma)');
  } catch (error) {
    console.error(`PostgreSQL Connection Error: ${error.message}`);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is set in server/.env');
    process.exit(1);
  }
};

module.exports = connectDB;
