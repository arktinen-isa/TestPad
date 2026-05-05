import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  pointsWeight: z.number().positive().default(1.0),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pointsWeight: z.number().positive().optional(),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
});

// GET /api/categories — authenticated
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const where = user.role === 'TEACHER' ? { createdById: user.userId } : {};

    const categories = await prisma.questionCategory.findMany({
      where,
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories.map((c) => ({
      id: c.id,
      name: c.name,
      pointsWeight: c.pointsWeight,
      timeLimitSeconds: c.timeLimitSeconds,
      questionCount: c._count.questions,
    })));
  })
);

// POST /api/categories — ADMIN+TEACHER
router.post(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const data = createCategorySchema.parse(req.body);
    const user = req.user!;

    const category = await prisma.questionCategory.create({
      data: {
        name: data.name,
        pointsWeight: data.pointsWeight,
        timeLimitSeconds: data.timeLimitSeconds,
        createdById: user.userId,
      },
    });

    res.status(201).json(category);
  })
);

// PATCH /api/categories/:id — ADMIN+TEACHER
router.patch(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;
    const data = updateCategorySchema.parse(req.body);

    const existing = await prisma.questionCategory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const category = await prisma.questionCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.pointsWeight !== undefined && { pointsWeight: data.pointsWeight }),
        ...(data.timeLimitSeconds !== undefined && { timeLimitSeconds: data.timeLimitSeconds }),
      },
    });

    res.json(category);
  })
);

// DELETE /api/categories/:id — ADMIN only
router.delete(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.questionCategory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.questionCategory.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
