import 'dotenv/config';
import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(
    `[server] OMFC Testing Backend running on port ${config.port} (${config.nodeEnv})`
  );
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`[server] ${signal} received. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    console.log('[server] Prisma disconnected.');
  } catch (err) {
    console.error('[server] Error during Prisma disconnect:', err);
  }
  server.close(() => {
    console.log('[server] Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
