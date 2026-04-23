import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
  jwtRefreshExpiresIn: '7d',
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  bcryptRounds: 12,
};
