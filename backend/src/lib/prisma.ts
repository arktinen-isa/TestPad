import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

const dbUrl = process.env['DATABASE_URL'];
const connectionLimit = 5;
const poolTimeout = 20;

const prismaOptions = {
  datasources: {
    db: {
      url: `${dbUrl}${dbUrl?.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`,
    },
  },
};

if (process.env['NODE_ENV'] === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      ...prismaOptions,
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

export default prisma;
