import { Router } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  })
);

export default router;
