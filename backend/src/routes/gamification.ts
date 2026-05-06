import { Router } from 'express';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/gamification/status
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        streakCount: true,
        lastActiveDate: true,
        badges: {
          include: {
            badge: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      xp: user.xp,
      streakCount: user.streakCount,
      lastActiveDate: user.lastActiveDate,
      badges: user.badges.map(ub => ub.badge)
    });
  })
);

// GET /api/gamification/leaderboard
router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Fetch user groups to scope leaderboard to user's peers
    const userGroups = await prisma.userGroup.findMany({
      where: { userId },
      select: { groupId: true }
    });
    const groupIds = userGroups.map(ug => ug.groupId);

    const where: any = {};
    if (groupIds.length > 0) {
      where.groups = { some: { groupId: { in: groupIds } } };
    }

    const leaders = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        xp: true,
        streakCount: true,
        badges: {
          select: {
            badge: { select: { imageUrl: true, title: true } }
          }
        },
        groups: { select: { group: { select: { name: true } } } }
      },
      orderBy: { xp: 'desc' },
      take: 10
    });

    res.json(leaders);
  })
);

export default router;
