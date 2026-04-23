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
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pointsWeight: z.number().positive().optional(),
});

// GET /api/categories — authenticated
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.questionCategory.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories.map((c) => ({
      id: c.id,
      name: c.name,
      pointsWeight: c.pointsWeight,
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

    const category = await prisma.questionCategory.create({
      data: {
        name: data.name,
        pointsWeight: data.pointsWeight,
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
    const data = updateCategorySchema.parse(req.body);

    const category = await prisma.questionCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.pointsWeight !== undefined && { pointsWeight: data.pointsWeight }),
      },
    });

    res.json(category);
  })
);

// DELETE /api/categories/:id — ADMIN only
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.questionCategory.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
