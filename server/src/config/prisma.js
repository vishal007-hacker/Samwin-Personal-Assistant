const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { databaseUrl } = require('./env');

// Prisma 7 ships a WASM query compiler and requires a driver adapter to
// actually speak the Postgres wire protocol. Create one pg adapter from the
// configured DATABASE_URL and pass it to every PrismaClient instance.
const adapter = new PrismaPg({ connectionString: databaseUrl });

// Singleton Prisma client (reuse one connection pool across the app).
const globalForPrisma = global;

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.__prisma;
}

module.exports = prisma;