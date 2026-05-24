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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalTests, totalStudents, totalQuestions, activeTests, testStatusGroups, recentAttempts] = await Promise.all([
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
          groups: { select: { group: { select: { name: true } } } },
          _count: { select: { attempts: true } },
        },
      }),
      prisma.test.groupBy({
        by: ['status'],
        where: whereTests,
        _count: {
          _all: true,
        },
      }),
      prisma.attempt.findMany({
        where: {
          startedAt: {
            gte: sevenDaysAgo,
          },
          test: whereTests,
        },
        select: {
          startedAt: true,
        },
      }),
    ]);

    const testStatusCounts = {
      OPEN: 0,
      CLOSED: 0,
      DRAFT: 0,
    };

    testStatusGroups.forEach((group) => {
      if (group.status in testStatusCounts) {
        testStatusCounts[group.status as keyof typeof testStatusCounts] = group._count._all;
      }
    });

    // Group attempts by day for the last 7 days
    const dailyActivity = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
      
      const count = recentAttempts.filter((a) => {
        const attemptDate = new Date(a.startedAt);
        return (
          attemptDate.getDate() === d.getDate() &&
          attemptDate.getMonth() === d.getMonth() &&
          attemptDate.getFullYear() === d.getFullYear()
        );
      }).length;

      return { name: dateStr, value: count };
    });

    res.json({
      totalTests,
      totalStudents,
      totalQuestions,
      activeTests,
      testStatusCounts,
      dailyActivity,
    });
  })
);

export default router;
