import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
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

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow configured frontend origin
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

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

// Global error handler — must be last
app.use(errorHandler);

export default app;
