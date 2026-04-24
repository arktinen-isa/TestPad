import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const categoryQuotaSchema = z.object({
  categoryId: z.string().uuid(),
  quota: z.number().int().positive(),
});

const createTestSchema = z.object({
  title: z.string().min(1).max(255),
  subject: z.string().optional(),
  timeLimitMin: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().positive().default(1),
  openFrom: z.string().datetime().optional(),
  openUntil: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('DRAFT'),
  questionsCount: z.number().int().positive().default(10),
  samplingMode: z.enum(['FROM_BANK', 'BY_CATEGORY']).default('FROM_BANK'),
  scoringMode: z.enum(['SUM', 'PERCENTAGE']).default('SUM'),
  passThreshold: z.number().min(0).max(100).optional(),
  showResultMode: z.enum(['AFTER_FINISH', 'ADMIN_ONLY', 'AFTER_TEST_CLOSED']).default('AFTER_FINISH'),
  shuffleQuestions: z.boolean().default(true),
  multiScoringMode: z.enum(['ALL_OR_NOTHING', 'PARTIAL']).default('ALL_OR_NOTHING'),
  groupIds: z.array(z.string().uuid()).optional(),
  questionIds: z.array(z.string().uuid()).optional(),
  categoryQuotas: z.array(categoryQuotaSchema).optional(),
});

const updateTestSchema = createTestSchema.partial();

// GET /api/tests
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {};

    if (user.role === 'STUDENT') {
      // Student sees open tests assigned to their groups
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((ug) => ug.groupId);

      where = {
        status: 'OPEN',
        groups: {
          some: {
            groupId: { in: groupIds },
          },
        },
      };
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.test.count({ where }),
    ]);

    res.json({ data: tests, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// POST /api/tests — ADMIN+TEACHER
router.post(
  '/',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const data = createTestSchema.parse(req.body);
    const user = req.user!;

    const test = await prisma.test.create({
      data: {
        title: data.title,
        subject: data.subject,
        createdById: user.userId,
        timeLimitMin: data.timeLimitMin,
        maxAttempts: data.maxAttempts,
        openFrom: data.openFrom ? new Date(data.openFrom) : undefined,
        openUntil: data.openUntil ? new Date(data.openUntil) : undefined,
        status: data.status,
        questionsCount: data.questionsCount,
        samplingMode: data.samplingMode,
        scoringMode: data.scoringMode,
        passThreshold: data.passThreshold,
        showResultMode: data.showResultMode,
        shuffleQuestions: data.shuffleQuestions,
        multiScoringMode: data.multiScoringMode,
        groups: data.groupIds
          ? { create: data.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
        questions: data.questionIds
          ? { create: data.questionIds.map((questionId) => ({ questionId })) }
          : undefined,
        categoryQuotas: data.categoryQuotas
          ? {
              create: data.categoryQuotas.map((cq) => ({
                categoryId: cq.categoryId,
                quota: cq.quota,
              })),
            }
          : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        questions: { select: { questionId: true } },
        categoryQuotas: true,
      },
    });

    res.status(201).json(test);
  })
);

// GET /api/tests/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        questions: { select: { questionId: true } },
        categoryQuotas: {
          include: { category: { select: { id: true, name: true } } },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Students can only see tests accessible to them
    if (user.role === 'STUDENT') {
      if (test.status !== 'OPEN') {
        res.status(403).json({ error: 'Test is not available' });
        return;
      }
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true },
      });
      const userGroupIds = new Set(userGroups.map((ug) => ug.groupId));
      const testGroupIds = test.groups.map((tg) => tg.group.id);
      const hasAccess = testGroupIds.some((gid) => userGroupIds.has(gid));
      if (!hasAccess) {
        res.status(403).json({ error: 'You do not have access to this test' });
        return;
      }
    }

    res.json({
      ...test,
      questionsInBankCount: test.questions.length,
    });
  })
);

// PATCH /api/tests/:id — ADMIN+TEACHER
router.patch(
  '/:id',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateTestSchema.parse(req.body);

    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.title !== undefined) updatePayload['title'] = data.title;
    if (data.subject !== undefined) updatePayload['subject'] = data.subject;
    if (data.timeLimitMin !== undefined) updatePayload['timeLimitMin'] = data.timeLimitMin;
    if (data.maxAttempts !== undefined) updatePayload['maxAttempts'] = data.maxAttempts;
    if (data.openFrom !== undefined) updatePayload['openFrom'] = data.openFrom ? new Date(data.openFrom) : null;
    if (data.openUntil !== undefined) updatePayload['openUntil'] = data.openUntil ? new Date(data.openUntil) : null;
    if (data.status !== undefined) updatePayload['status'] = data.status;
    if (data.questionsCount !== undefined) updatePayload['questionsCount'] = data.questionsCount;
    if (data.samplingMode !== undefined) updatePayload['samplingMode'] = data.samplingMode;
    if (data.scoringMode !== undefined) updatePayload['scoringMode'] = data.scoringMode;
    if (data.passThreshold !== undefined) updatePayload['passThreshold'] = data.passThreshold;
    if (data.showResultMode !== undefined) updatePayload['showResultMode'] = data.showResultMode;
    if (data.shuffleQuestions !== undefined) updatePayload['shuffleQuestions'] = data.shuffleQuestions;
    if (data.multiScoringMode !== undefined) updatePayload['multiScoringMode'] = data.multiScoringMode;

    // Handle relationship updates
    if (data.groupIds !== undefined) {
      await prisma.testGroup.deleteMany({ where: { testId: id } });
      updatePayload['groups'] = {
        create: data.groupIds.map((groupId) => ({ groupId })),
      };
    }

    if (data.questionIds !== undefined) {
      await prisma.testQuestion.deleteMany({ where: { testId: id } });
      updatePayload['questions'] = {
        create: data.questionIds.map((questionId) => ({ questionId })),
      };
    }

    if (data.categoryQuotas !== undefined) {
      await prisma.testCategoryQuota.deleteMany({ where: { testId: id } });
      updatePayload['categoryQuotas'] = {
        create: data.categoryQuotas.map((cq) => ({
          categoryId: cq.categoryId,
          quota: cq.quota,
        })),
      };
    }

    const test = await prisma.test.update({
      where: { id },
      data: updatePayload,
      include: {
        createdBy: { select: { id: true, name: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        questions: { select: { questionId: true } },
        categoryQuotas: true,
      },
    });

    res.json(test);
  })
);

// DELETE /api/tests/:id — ADMIN only
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    await prisma.test.delete({ where: { id } });
    res.status(204).send();
  })
);

// GET /api/tests/:id/results — ADMIN+TEACHER, paginated attempt results
router.get(
  '/:id/results',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    const test = await prisma.test.findUnique({ where: { id } });
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    const [attempts, total] = await Promise.all([
      prisma.attempt.findMany({
        where: { testId: id, finishedAt: { not: null } },
        skip,
        take: limit,
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.attempt.count({ where: { testId: id, finishedAt: { not: null } } }),
    ]);

    res.json({
      data: attempts.map((a) => ({
        id: a.id,
        student: a.student,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        finishReason: a.finishReason,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.score !== null && a.maxScore !== null && a.maxScore > 0
          ? Math.round((a.score / a.maxScore) * 100)
          : null,
        passed: test.passThreshold !== null && a.score !== null && a.maxScore !== null && a.maxScore > 0
          ? (a.score / a.maxScore) * 100 >= test.passThreshold
          : null,
        suspiciousEventsCount: a.suspiciousEventsCount,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// GET /api/tests/:id/results/export — ADMIN+TEACHER, CSV export of all attempt results
router.get(
  '/:id/results/export',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const groupId = req.query['groupId'] as string | undefined;

    const test = await prisma.test.findUnique({ where: { id } });
    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Build attempt filter
    const attemptWhere: Record<string, unknown> = {
      testId: id,
      finishedAt: { not: null },
    };

    // If groupId filter provided, only include students belonging to that group
    if (groupId) {
      attemptWhere['student'] = {
        groups: { some: { groupId } },
      };
    }

    const attempts = await prisma.attempt.findMany({
      where: attemptWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            groups: {
              select: {
                group: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // CSV helpers
    const escapeCsv = (value: string | number | null | undefined): string => {
      const str = value === null || value === undefined ? '' : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Студент', 'Email', 'Група', 'Дата', 'Бал', 'Макс.бал', 'Відсоток', 'Час(хв)', 'Підозрілих подій'];

    const rows = attempts.map((a) => {
      const groupName = a.student.groups.map((ug) => ug.group.name).join('; ');
      const date = a.finishedAt ? a.finishedAt.toISOString().replace('T', ' ').substring(0, 19) : '';
      const score = a.score !== null ? a.score : '';
      const maxScore = a.maxScore !== null ? a.maxScore : '';
      const percentage =
        a.score !== null && a.maxScore !== null && a.maxScore > 0
          ? Math.round((a.score / a.maxScore) * 100)
          : '';
      const timeSpentMin =
        a.finishedAt !== null && a.startedAt !== null
          ? Math.round((a.finishedAt.getTime() - a.startedAt.getTime()) / 60000)
          : '';

      return [
        escapeCsv(a.student.name),
        escapeCsv(a.student.email),
        escapeCsv(groupName),
        escapeCsv(date),
        escapeCsv(score),
        escapeCsv(maxScore),
        escapeCsv(percentage),
        escapeCsv(timeSpentMin),
        escapeCsv(a.suspiciousEventsCount),
      ].join(',');
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

    // Prepend UTF-8 BOM for Excel compatibility
    const bom = '﻿';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="results_${id}.csv"`);
    res.send(bom + csv);
  })
);

// GET /api/tests/:id/stats/questions — ADMIN+TEACHER, per-question correctness statistics
router.get(
  '/:id/stats/questions',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: {
                answers: { select: { id: true, isCorrect: true } },
              },
            },
          },
        },
      },
    });

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Fetch all AttemptQuestions for this test's questions, with their answers
    const questionIds = test.questions.map((tq) => tq.questionId);

    const attemptQuestions = await prisma.attemptQuestion.findMany({
      where: {
        questionId: { in: questionIds },
        attempt: { testId: id, finishedAt: { not: null } },
      },
      include: {
        attemptAnswers: { select: { answerId: true, selected: true } },
      },
    });

    // Group AttemptQuestions by questionId for efficient processing
    const aqByQuestion = new Map<string, typeof attemptQuestions>();
    for (const aq of attemptQuestions) {
      if (!aqByQuestion.has(aq.questionId)) {
        aqByQuestion.set(aq.questionId, []);
      }
      aqByQuestion.get(aq.questionId)!.push(aq);
    }

    const stats = test.questions.map((tq) => {
      const q = tq.question;
      const aqs = aqByQuestion.get(q.id) ?? [];

      // Only count answered questions
      const answered = aqs.filter((aq) => aq.answeredAt !== null);
      const totalAnswered = answered.length;

      const correctAnswerIds = new Set(q.answers.filter((a) => a.isCorrect).map((a) => a.id));

      let correctCount = 0;

      for (const aq of answered) {
        const selectedIds = new Set(aq.attemptAnswers.filter((aa) => aa.selected).map((aa) => aa.answerId));

        if (q.type === 'SINGLE') {
          // Correct if the student selected the single correct answer
          const [correctId] = [...correctAnswerIds];
          if (correctId && selectedIds.has(correctId) && selectedIds.size === 1) {
            correctCount++;
          }
        } else {
          // MULTI — ALL_OR_NOTHING: all correct selected and no wrong selected
          const allCorrectSelected = [...correctAnswerIds].every((cid) => selectedIds.has(cid));
          const noWrongSelected = [...selectedIds].every((sid) => correctAnswerIds.has(sid));
          if (allCorrectSelected && noWrongSelected) {
            correctCount++;
          }
        }
      }

      const correctPct = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

      return {
        questionId: q.id,
        questionText: q.text.substring(0, 80),
        questionType: q.type,
        totalAnswered,
        correctCount,
        correctPct: Math.round(correctPct * 100) / 100,
      };
    });

    // Sort by correctPct ascending (hardest first)
    stats.sort((a, b) => a.correctPct - b.correctPct);

    res.json(stats);
  })
);

export default router;
