import { Router } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats
router.get(
  '/stats',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;

    const whereTests =
      user.role === 'TEACHER' ? { createdById: user.userId } : {};

    const [totalTests, totalStudents, totalQuestions, activeTests] = await Promise.all([
      prisma.test.count({ where: whereTests }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.question.count(),
      prisma.test.findMany({
        where: { ...whereTests, status: 'OPEN' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          subject: true,
          status: true,
          openFrom: true,
          openUntil: true,
          questionsCount: true,
          createdAt: true,
          _count: { select: { attempts: true } },
        },
      }),
    ]);

    res.json({ totalTests, totalStudents, totalQuestions, activeTests });
  })
);

export default router;
