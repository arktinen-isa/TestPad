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
  type: z.enum(['SINGLE', 'MULTI', 'MATCHING', 'ORDERING']),
  categoryId: z.string().uuid(),
  imageUrl: z.string().optional(),
  answers: z.array(answerSchema).optional(),
  matchingPairs: z.any().optional(),
  orderingItems: z.any().optional(),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
});

const updateAnswerSchema = z.object({
  id: z.string().uuid().optional(), // existing answer id
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const updateQuestionSchema = z.object({
  text: z.string().min(1).optional(),
  type: z.enum(['SINGLE', 'MULTI', 'MATCHING', 'ORDERING']).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().nullable().optional(),
  answers: z.array(updateAnswerSchema).optional(),
  matchingPairs: z.any().optional(),
  orderingItems: z.any().optional(),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
});

// GET /api/questions — ADMIN+TEACHER, with filters
router.get(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const category = req.query['category'] as string;
    const type = req.query['type'] as string;
    const search = req.query['search'] as string;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.role === 'TEACHER') {
      where['createdById'] = user.userId;
    }

    if (category) where['categoryId'] = category as string;
    if (type && (type === 'SINGLE' || type === 'MULTI')) where['type'] = type;
    if (search) {
      where['text'] = { contains: search as string };
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

// POST /api/questions/bulk — ADMIN+TEACHER
router.post(
  '/bulk',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const questions = req.body; 
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Expected an array of questions' });
    }

    const user = req.user!;
    const created = await Promise.all(
      questions.map((q) =>
        prisma.question.create({
          data: {
            text: q.text,
            type: q.type || 'SINGLE',
            categoryId: q.categoryId,
            createdById: user.userId,
            imageUrl: q.imageUrl,
            answers: {
              create: q.answers.map((a: any) => ({
                text: a.text,
                isCorrect: !!a.isCorrect,
              })),
            },
          },
        })
      )
    );

    res.status(201).json({ count: created.length });
  })
);

// PATCH /api/questions/bulk — ADMIN+TEACHER (Bulk update)
router.patch(
  '/bulk',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { ids, data } = req.body;
    const where: any = { id: { in: ids } };
    if (user.role === 'TEACHER') {
      where['createdById'] = user.userId;
    }

    await prisma.question.updateMany({
      where,
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
    });

    res.json({ success: true });
  })
);

// DELETE /api/questions/bulk — ADMIN+TEACHER
router.delete(
  '/bulk',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const user = req.user!;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const where: any = { id: { in: ids } };
    if (user.role === 'TEACHER') {
      where['createdById'] = user.userId;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find all answers for these questions to clean up AttemptAnswer
      const answers = await tx.answer.findMany({
        where: { questionId: { in: ids } },
        select: { id: true }
      });
      const answerIds = answers.map(a => a.id);
      
      // 2. Find all AttemptQuestions for these questions
      const attemptQuestions = await tx.attemptQuestion.findMany({
        where: { questionId: { in: ids } },
        select: { id: true }
      });
      const aqIds = attemptQuestions.map(aq => aq.id);

      // 3. Delete dependencies
      if (answerIds.length > 0) {
        await tx.attemptAnswer.deleteMany({ where: { answerId: { in: answerIds } } });
      }
      if (aqIds.length > 0) {
        await tx.attemptAnswer.deleteMany({ where: { attemptQuestionId: { in: aqIds } } });
        await tx.attemptQuestion.deleteMany({ where: { id: { in: aqIds } } });
      }
      
      // 4. Delete questions (cascades to answers and testQuestions)
      await tx.testQuestion.deleteMany({ where: { questionId: { in: ids } } });
      await tx.question.deleteMany({ where: { id: { in: ids } } });
    });

    res.status(204).send();
  })
);

// POST /api/questions — ADMIN+TEACHER
router.post(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const data = createQuestionSchema.parse(req.body);
    const user = req.user!;

    // Validate category exists
    const category = await prisma.questionCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    if (user.role === 'TEACHER' && category.createdById !== user.userId) {
      res.status(403).json({ error: 'Cannot add question to a category you do not own' });
      return;
    }

    const question = await prisma.question.create({
      data: {
        text: data.text,
        type: data.type,
        categoryId: data.categoryId,
        createdById: user.userId,
        imageUrl: data.imageUrl,
        answers: data.answers && data.answers.length > 0 ? {
          create: data.answers.map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        } : undefined,
        matchingPairs: data.matchingPairs,
        orderingItems: data.orderingItems,
        timeLimitSeconds: data.timeLimitSeconds,
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
    const user = req.user!;

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

    if (user.role === 'TEACHER' && question.createdById !== user.userId) {
      res.status(403).json({ error: 'Insufficient permissions' });
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
    const user = req.user!;
    const data = updateQuestionSchema.parse(req.body);

    // Verify question exists
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      res.status(403).json({ error: 'Insufficient permissions' });
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
    if (data.matchingPairs !== undefined) updatePayload['matchingPairs'] = data.matchingPairs;
    if (data.orderingItems !== undefined) updatePayload['orderingItems'] = data.orderingItems;
    if (data.timeLimitSeconds !== undefined) updatePayload['timeLimitSeconds'] = data.timeLimitSeconds;

    // If answers provided, replace all answers
    if (data.answers !== undefined) {
      await prisma.answer.deleteMany({ where: { questionId: id } });
      if (data.answers.length > 0) {
        updatePayload['answers'] = {
          create: data.answers.map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        };
      }
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

// DELETE /api/questions/:id — ADMIN only (hard delete)
router.delete(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (user.role === 'TEACHER' && existing.createdById !== user.userId) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const answers = await tx.answer.findMany({ where: { questionId: id }, select: { id: true } });
      const answerIds = answers.map(a => a.id);
      const attemptQuestions = await tx.attemptQuestion.findMany({ where: { questionId: id }, select: { id: true } });
      const aqIds = attemptQuestions.map(aq => aq.id);

      if (answerIds.length > 0) {
        await tx.attemptAnswer.deleteMany({ where: { answerId: { in: answerIds } } });
      }
      if (aqIds.length > 0) {
        await tx.attemptAnswer.deleteMany({ where: { attemptQuestionId: { in: aqIds } } });
        await tx.attemptQuestion.deleteMany({ where: { id: { in: aqIds } } });
      }

      await tx.testQuestion.deleteMany({ where: { questionId: id } });
      await tx.question.delete({ where: { id } });
    });

    res.status(204).send();
  })
);

export default router;
