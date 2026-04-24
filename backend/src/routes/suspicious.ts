import { Router } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/suspicious?testId=&studentId=&page=
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { testId, studentId } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (testId) where['attempt'] = { testId };
    if (studentId) where['attempt'] = { ...(where['attempt'] as object || {}), studentId };

    const [events, total] = await Promise.all([
      prisma.suspiciousEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          attempt: {
            select: {
              id: true,
              testId: true,
              test: { select: { title: true } },
              student: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.suspiciousEvent.count({ where }),
    ]);

    res.json({ events, total, page, limit });
  })
);

// GET /api/suspicious/attempt/:attemptId — detail for one attempt
router.get(
  '/attempt/:attemptId',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;

    const events = await prisma.suspiciousEvent.findMany({
      where: { attemptId },
      orderBy: { occurredAt: 'asc' },
    });

    res.json(events);
  })
);

export default router;
