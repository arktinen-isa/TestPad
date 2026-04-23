import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const answerSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const createQuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE', 'MULTI']),
  categoryId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  answers: z.array(answerSchema).min(2),
});

const updateAnswerSchema = z.object({
  id: z.string().uuid().optional(), // existing answer id
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const updateQuestionSchema = z.object({
  text: z.string().min(1).optional(),
  type: z.enum(['SINGLE', 'MULTI']).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  answers: z.array(updateAnswerSchema).min(2).optional(),
});

// GET /api/questions — ADMIN+TEACHER, with filters
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { category, type, search, active } = req.query;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) where['categoryId'] = category as string;
    if (type && (type === 'SINGLE' || type === 'MULTI')) where['type'] = type;
    if (search) {
      where['text'] = { contains: search as string };
    }
    if (active !== undefined) {
      where['isActive'] = active === 'true';
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, pointsWeight: true } },
          answers: { select: { id: true, text: true, isCorrect: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.question.count({ where }),
    ]);

    res.json({ data: questions, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// POST /api/questions — ADMIN+TEACHER
router.post(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const data = createQuestionSchema.parse(req.body);

    // Validate category exists
    const category = await prisma.questionCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const question = await prisma.question.create({
      data: {
        text: data.text,
        type: data.type,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        answers: {
          create: data.answers.map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        },
      },
      include: {
        category: { select: { id: true, name: true, pointsWeight: true } },
        answers: { select: { id: true, text: true, isCorrect: true } },
      },
    });

    res.status(201).json(question);
  })
);

// GET /api/questions/:id — ADMIN+TEACHER
router.get(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, pointsWeight: true } },
        answers: { select: { id: true, text: true, isCorrect: true } },
      },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json(question);
  })
);

// PATCH /api/questions/:id — ADMIN+TEACHER
router.patch(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateQuestionSchema.parse(req.body);

    // Verify question exists
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (data.categoryId) {
      const category = await prisma.questionCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (data.text !== undefined) updatePayload['text'] = data.text;
    if (data.type !== undefined) updatePayload['type'] = data.type;
    if (data.categoryId !== undefined) updatePayload['categoryId'] = data.categoryId;
    if (data.imageUrl !== undefined) updatePayload['imageUrl'] = data.imageUrl;
    if (data.isActive !== undefined) updatePayload['isActive'] = data.isActive;

    // If answers provided, replace all answers
    if (data.answers !== undefined) {
      await prisma.answer.deleteMany({ where: { questionId: id } });
      updatePayload['answers'] = {
        create: data.answers.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      };
    }

    const question = await prisma.question.update({
      where: { id },
      data: updatePayload,
      include: {
        category: { select: { id: true, name: true, pointsWeight: true } },
        answers: { select: { id: true, text: true, isCorrect: true } },
      },
    });

    res.json(question);
  })
);

// DELETE /api/questions/:id — ADMIN only (soft delete)
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  })
);

export default router;
