import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

const dbUrl = process.env['DATABASE_URL'];
const connectionLimit = 15;
const poolTimeout = 20;

const prismaOptions = {
  datasources: {
    db: {
      url: `${dbUrl}${dbUrl?.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&statement_cache_size=0`,
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

export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      // MySQL 1615: Prepared statement needs to be re-prepared
      if (err.message?.includes('1615')) {
         await new Promise(r => setTimeout(r, 100 * (i + 1)));
         continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export default prisma;
