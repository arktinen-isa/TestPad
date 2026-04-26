import { Router } from 'express';
import { z } from 'zod';
import prisma, { withDbRetry } from '../lib/prisma';
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
  openFrom: z.string().datetime().optional().nullable(),
  openUntil: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('DRAFT'),
  questionsCount: z.number().int().positive().default(10),
  samplingMode: z.enum(['FROM_BANK', 'BY_CATEGORY']).default('FROM_BANK'),
  scoringMode: z.enum(['SUM', 'PERCENTAGE']).default('SUM'),
  passThreshold: z.number().min(0).max(1000).optional(),
  showResultMode: z.enum(['AFTER_FINISH', 'ADMIN_ONLY']).default('AFTER_FINISH'),
  multiScoringMode: z.enum(['ALL_OR_NOTHING', 'PARTIAL']).default('ALL_OR_NOTHING'),
  groupIds: z.array(z.string().uuid()).optional(),
  questionIds: z.array(z.string().uuid()).optional(),
  categoryQuotas: z.array(categoryQuotaSchema).optional(),
  allowCertificate: z.boolean().optional().default(true),
  logoUrl: z.string().optional().nullable(),
});

const updateTestSchema = createTestSchema.partial();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {};

    if (user.role === 'STUDENT') {
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: user.userId },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((ug) => ug.groupId);
      where = {
        status: 'OPEN',
        groups: { some: { groupId: { in: groupIds } } },
      };
    }

    const [rawTests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          subject: true,
          status: true,
          timeLimitMin: true,
          maxAttempts: true,
          questionsCount: true,
          openFrom: true,
          openUntil: true,
          scoringMode: true,
          showResultMode: true,
          allowCertificate: true,
          passThreshold: true,
          logoUrl: true,
          groups: { select: { groupId: true } },
          samplingMode: true,
          categoryQuotas: { select: { categoryId: true, quota: true } },
          multiScoringMode: true,
          attempts: {
            where: user.role === 'STUDENT'
              ? { studentId: user.userId, finishedAt: { not: null } }
              : undefined,
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              score: true,
              maxScore: true,
              finishedAt: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.test.count({ where }),
    ]);

    let tests: any[] = rawTests;

    if (user.role === 'STUDENT') {
      const testIds = rawTests.map(t => t.id);
      const countRows = await prisma.attempt.groupBy({
        by: ['testId'],
        where: { testId: { in: testIds }, studentId: user.userId, finishedAt: { not: null } },
        _count: { id: true },
      });
      const countMap = new Map(countRows.map(r => [r.testId, r._count.id]));

      tests = rawTests.map(t => {
        const lastAttempt = t.attempts[0];
        let lastAttemptMapped = null;

        if (lastAttempt) {
          const s = lastAttempt.score ?? 0;
          const ms = lastAttempt.maxScore ?? 0;
          const pct = ms > 0 ? Math.round((s / ms) * 100) : 0;
          let passed = null;
          if (t.passThreshold !== null && lastAttempt.score !== null && lastAttempt.maxScore !== null) {
            passed = t.scoringMode === 'PERCENTAGE' ? pct >= t.passThreshold : s >= t.passThreshold;
          }
          const hideScore = t.showResultMode === 'ADMIN_ONLY';
          lastAttemptMapped = {
            id: lastAttempt.id,
            score: hideScore ? null : lastAttempt.score,
            maxScore: hideScore ? null : lastAttempt.maxScore,
            percentage: hideScore ? null : pct,
            passed: hideScore ? null : passed,
            finishedAt: lastAttempt.finishedAt,
          };
        }

        return { ...t, attemptsUsed: countMap.get(t.id) ?? 0, lastAttempt: lastAttemptMapped };
      });
    }

    res.json({ data: tests, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

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
        openFrom: data.openFrom ? new Date(data.openFrom) : null,
        openUntil: data.openUntil ? new Date(data.openUntil) : null,
        status: data.status,
        questionsCount: data.questionsCount,
        samplingMode: data.samplingMode,
        scoringMode: data.scoringMode,
        passThreshold: data.passThreshold,
        multiScoringMode: data.multiScoringMode,
        allowCertificate: data.allowCertificate,
        logoUrl: data.logoUrl,
        groups: data.groupIds
          ? { create: data.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
        questions: data.questionIds
          ? { create: data.questionIds.map((questionId) => ({ questionId })) }
          : undefined,
        categoryQuotas: data.categoryQuotas
          ? { create: data.categoryQuotas.map((cq) => ({ categoryId: cq.categoryId, quota: cq.quota })) }
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
        categoryQuotas: { include: { category: { select: { id: true, name: true } } } },
        _count: { select: { attempts: true } },
      },
    });

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

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
      if (!testGroupIds.some((gid) => userGroupIds.has(gid))) {
        res.status(403).json({ error: 'You do not have access to this test' });
        return;
      }
    }

    const responseData: Record<string, any> = { ...test, questionsInBankCount: test.questions.length };

    if (user.role === 'STUDENT') {
      responseData['attemptsUsed'] = await prisma.attempt.count({
        where: { testId: id, studentId: user.userId, finishedAt: { not: null } },
      });
    }

    res.json(responseData);
  })
);

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
    if (data.openFrom !== undefined) updatePayload['openFrom'] = data.openFrom ? new Date(data.openFrom) : data.openFrom === null ? null : undefined;
    if (data.openUntil !== undefined) updatePayload['openUntil'] = data.openUntil ? new Date(data.openUntil) : data.openUntil === null ? null : undefined;
    if (data.status !== undefined) updatePayload['status'] = data.status;
    if (data.questionsCount !== undefined) updatePayload['questionsCount'] = data.questionsCount;
    if (data.samplingMode !== undefined) updatePayload['samplingMode'] = data.samplingMode;
    if (data.scoringMode !== undefined) updatePayload['scoringMode'] = data.scoringMode;
    if (data.passThreshold !== undefined) updatePayload['passThreshold'] = data.passThreshold;
    if (data.showResultMode !== undefined) updatePayload['showResultMode'] = data.showResultMode;
    if (data.multiScoringMode !== undefined) updatePayload['multiScoringMode'] = data.multiScoringMode;
    if (data.allowCertificate !== undefined) updatePayload['allowCertificate'] = data.allowCertificate;
    if (data.logoUrl !== undefined) updatePayload['logoUrl'] = data.logoUrl;

    if (data.groupIds !== undefined) {
      await prisma.testGroup.deleteMany({ where: { testId: id } });
      updatePayload['groups'] = { create: data.groupIds.map((groupId) => ({ groupId })) };
    }
    if (data.questionIds !== undefined) {
      await prisma.testQuestion.deleteMany({ where: { testId: id } });
      updatePayload['questions'] = { create: data.questionIds.map((questionId) => ({ questionId })) };
    }
    if (data.categoryQuotas !== undefined) {
      await prisma.testCategoryQuota.deleteMany({ where: { testId: id } });
      updatePayload['categoryQuotas'] = {
        create: data.categoryQuotas.map((cq) => ({ categoryId: cq.categoryId, quota: cq.quota })),
      };
    }

    const test = await withDbRetry(() =>
      prisma.test.update({
        where: { id },
        data: updatePayload,
        include: {
          createdBy: { select: { id: true, name: true } },
          groups: { include: { group: { select: { id: true, name: true } } } },
          questions: { select: { questionId: true } },
          categoryQuotas: true,
        },
      })
    );

    res.json(test);
  })
);

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

    await withDbRetry(async () => {
      await prisma.$transaction(async (tx) => {
        const attemptIds = (
          await tx.attempt.findMany({ where: { testId: id }, select: { id: true } })
        ).map(a => a.id);

        if (attemptIds.length > 0) {
          await tx.suspiciousEvent.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await tx.attemptAnswer.deleteMany({ where: { attemptQuestion: { attemptId: { in: attemptIds } } } });
          await tx.attemptQuestion.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await tx.attempt.deleteMany({ where: { id: { in: attemptIds } } });
        }

        await tx.testQuestion.deleteMany({ where: { testId: id } });
        await tx.testGroup.deleteMany({ where: { testId: id } });
        await tx.testCategoryQuota.deleteMany({ where: { testId: id } });
        await tx.test.delete({ where: { id } });
      });
    });

    res.status(204).send();
  })
);

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
        select: {
          id: true,
          startedAt: true,
          finishedAt: true,
          finishReason: true,
          score: true,
          maxScore: true,
          suspiciousEventsCount: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              groups: { select: { group: { select: { name: true } } } },
            },
          },
          suspiciousEvents: { select: { id: true, eventType: true, occurredAt: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.attempt.count({ where: { testId: id, finishedAt: { not: null } } }),
    ]);

    const attemptsMapped = attempts.map((a) => {
      const ms = a.maxScore ?? 0;
      const s = a.score ?? 0;
      const pct = ms > 0 ? (s / ms) * 100 : 0;
      return {
        id: a.id,
        user: { ...a.student, group: a.student.groups[0]?.group },
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        finishReason: a.finishReason,
        score: a.score,
        maxScore: a.maxScore,
        percentage: Math.round(pct * 10) / 10,
        passed: test.passThreshold !== null ? pct >= test.passThreshold : null,
        timeSpentSec: a.finishedAt
          ? Math.floor((a.finishedAt.getTime() - a.startedAt.getTime()) / 1000)
          : 0,
        suspiciousEvents: a.suspiciousEvents,
      };
    });

    res.json({
      test: { id: test.id, title: test.title, subject: test.subject, passThreshold: test.passThreshold },
      attempts: attemptsMapped,
      total,
      stats: {
        avgScore: 0,
        avgPct: attemptsMapped.length > 0
          ? attemptsMapped.reduce((acc, a) => acc + (a.percentage || 0), 0) / attemptsMapped.length
          : 0,
        passCount: attemptsMapped.filter(a => a.passed).length,
      },
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  })
);

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

    const attemptWhere: Record<string, unknown> = { testId: id, finishedAt: { not: null } };
    if (groupId) {
      attemptWhere['student'] = { groups: { some: { groupId } } };
    }

    const attempts = await prisma.attempt.findMany({
      where: attemptWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            groups: { select: { group: { select: { name: true } } } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const escapeCsv = (value: string | number | null | undefined): string => {
      const str = value === null || value === undefined ? '' : String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const headers = ['Студент', 'Email', 'Група', 'Дата', 'Бал', 'Макс.бал', 'Відсоток', 'Час(хв)', 'Підозрілих подій'];

    const rows = attempts.map((a) => {
      const groupName = a.student.groups.map((ug) => ug.group.name).join('; ');
      const date = a.finishedAt ? a.finishedAt.toISOString().replace('T', ' ').substring(0, 19) : '';
      const percentage =
        a.score !== null && a.maxScore !== null && a.maxScore > 0
          ? Math.round((a.score / a.maxScore) * 100)
          : '';
      const timeSpentMin =
        a.finishedAt ? Math.round((a.finishedAt.getTime() - a.startedAt.getTime()) / 60000) : '';

      return [
        escapeCsv(a.student.name),
        escapeCsv(a.student.email),
        escapeCsv(groupName),
        escapeCsv(date),
        escapeCsv(a.score !== null ? a.score : ''),
        escapeCsv(a.maxScore !== null ? a.maxScore : ''),
        escapeCsv(percentage),
        escapeCsv(timeSpentMin),
        escapeCsv(a.suspiciousEventsCount),
      ].join(',');
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="results_${id}.csv"`);
    res.send('﻿' + csv);
  })
);

router.get(
  '/:id/stats/questions',
  authorize('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const usedAqs = await prisma.attemptQuestion.findMany({
      where: { attempt: { testId: id, finishedAt: { not: null } } },
      select: { questionId: true },
      distinct: ['questionId'],
    });

    const questionIds = usedAqs.map(aq => aq.questionId);

    const [questionsData, attemptQuestions] = await Promise.all([
      prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: { answers: { select: { id: true, isCorrect: true } } },
      }),
      prisma.attemptQuestion.findMany({
        where: { questionId: { in: questionIds }, attempt: { testId: id, finishedAt: { not: null } } },
        include: { attemptAnswers: { select: { answerId: true, selected: true } } },
      }),
    ]);

    const questionDataMap = new Map(questionsData.map(q => [q.id, q]));

    const aqByQuestion = new Map<string, typeof attemptQuestions>();
    for (const aq of attemptQuestions) {
      if (!aqByQuestion.has(aq.questionId)) aqByQuestion.set(aq.questionId, []);
      aqByQuestion.get(aq.questionId)!.push(aq);
    }

    const stats = questionIds
      .map((qId) => {
        const q = questionDataMap.get(qId);
        if (!q) return null;

        const answered = (aqByQuestion.get(qId) ?? []).filter(aq => aq.answeredAt !== null);
        const totalAnswered = answered.length;
        const correctAnswerIds = new Set(q.answers.filter(a => a.isCorrect).map(a => a.id));
        let correctCount = 0;

        for (const aq of answered) {
          const selectedIds = new Set(aq.attemptAnswers.filter(aa => aa.selected).map(aa => aa.answerId));
          if (q.type === 'SINGLE') {
            const [correctId] = [...correctAnswerIds];
            if (correctId && selectedIds.has(correctId) && selectedIds.size === 1) correctCount++;
          } else {
            const allCorrect = [...correctAnswerIds].every(cid => selectedIds.has(cid));
            const noWrong = [...selectedIds].every(sid => correctAnswerIds.has(sid));
            if (allCorrect && noWrong) correctCount++;
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
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.correctPct - b.correctPct);

    res.json(stats);
  })
);

export default router;
