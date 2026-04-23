import 'dotenv/config';
import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(
    `[server] OMFC Testing Backend running on port ${config.port} (${config.nodeEnv})`
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[server] Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('[server] Server closed.');
    process.exit(0);
  });
});

export default server;
