import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import groupsRouter from './routes/groups';
import categoriesRouter from './routes/categories';
import questionsRouter from './routes/questions';
import testsRouter from './routes/tests';
import attemptsRouter from './routes/attempts';
import eventsRouter from './routes/events';
import dashboardRouter from './routes/dashboard';
import uploadRouter from './routes/upload';
import suspiciousRouter from './routes/suspicious';

const app = express();

// Trust proxy for rate-limiting
app.set('trust proxy', 1);

// Security headers - optimized for React SPA with Google Fonts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "img-src": ["'self'", "data:", "blob:", "*"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "connect-src": ["'self'", "*"],
      "frame-src": ["'none'"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — only allow configured frontend origin
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// Static uploads
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/suspicious', suspiciousRouter);

// Serve React SPA — must be after all API routes
const frontendDist = path.join(__dirname, '..', 'public');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global error handler — must be last
app.use(errorHandler);

export default app;
