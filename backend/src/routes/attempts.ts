import { Router } from 'express';
import { z } from 'zod';
import prisma, { withDbRetry } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { sampleFromBank, sampleByCategory } from '../services/samplingService';
import { scoreAttempt } from '../services/scoringService';
import { calculatePsychometrics, updateDailyStreak } from '../services/analyticsService';

const router = Router();
router.use(authenticate);

// In-memory cache for test structure to reduce DB load
// Key: testId, Value: { questions: Map<questionId, questionData>, total: number }
const testCache = new Map<string, any>();
const TEST_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const startAttemptSchema = z.object({
  testId: z.string().uuid(),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answerIds: z.array(z.string().uuid()).optional(),
  matchingPairs: z.any().optional(),
  orderingItems: z.any().optional(),
});

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function isTimedOut(startedAt: Date, timeLimitMin: number): boolean {
  if (timeLimitMin <= 0) return false;
  return Date.now() - startedAt.getTime() > timeLimitMin * 60 * 1000;
}

async function finishAttempt(
  attemptId: string,
  reason: 'NORMAL' | 'TIMEOUT' | 'EXIT'
): Promise<{
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean | null;
  passThreshold: number | null;
  scoringMode: string;
  showResultMode: string;
}> {
  const attempt = await withDbRetry(() => prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      startedAt: true,
      studentId: true,
      testId: true,
      test: {
        select: {
          multiScoringMode: true,
          passThreshold: true,
          scoringMode: true,
          showResultMode: true,
        },
      },
      attemptQuestions: {
        select: {
          submittedAnswer: true,
          question: {
            select: {
              type: true,
              matchingPairs: true,
              orderingItems: true,
              category: { select: { pointsWeight: true } },
              answers: { select: { id: true, isCorrect: true } },
            },
          },
          attemptAnswers: {
            select: { answerId: true, selected: true },
          },
        },
      },
    },
  }));

  if (!attempt) throw new Error('Attempt not found');

  const { score, maxScore } = scoreAttempt(
    attempt.attemptQuestions.map((aq: any) => ({
      question: {
        type: aq.question.type as any,
        answers: aq.question.answers,
        matchingPairs: aq.question.matchingPairs,
        orderingItems: aq.question.orderingItems,
        category: { pointsWeight: aq.question.category.pointsWeight },
      },
      attemptAnswers: aq.attemptAnswers,
      submittedAnswer: aq.submittedAnswer,
    })),
    attempt.test.multiScoringMode as 'ALL_OR_NOTHING' | 'PARTIAL'
  );

  await withDbRetry(() => prisma.attempt.update({
    where: { id: attemptId },
    data: { finishedAt: new Date(), finishReason: reason, score, maxScore },
  }));

  // Trigger post-attempt services
  try {
    await updateDailyStreak(attempt.studentId);
    await calculatePsychometrics(attempt.testId);
  } catch (err) {
    console.error('Error in post-attempt services:', err);
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;
  const passed =
    attempt.test.passThreshold !== null
      ? attempt.test.scoringMode === 'PERCENTAGE'
        ? percentage >= attempt.test.passThreshold
        : score >= attempt.test.passThreshold
      : null;

  return {
    score,
    maxScore,
    percentage,
    passed,
    passThreshold: attempt.test.passThreshold,
    scoringMode: attempt.test.scoringMode,
    showResultMode: attempt.test.showResultMode,
  };
}

async function getStudentQuestion(attemptId: string, index: number) {
  // Direct fetch with minimal fields
  const aq = await prisma.attemptQuestion.findFirst({
    where: { attemptId, orderIndex: index },
    include: {
      attempt: {
        select: {
          test: { select: { timerMode: true } },
          _count: { select: { attemptQuestions: true } }
        }
      },
      question: {
        select: {
          id: true,
          text: true,
          type: true,
          imageUrl: true,
          matchingPairs: true,
          orderingItems: true,
          category: { select: { timeLimitSeconds: true } },
          answers: { select: { id: true, text: true } }
        }
      }
    }
  });

  if (!aq) return null;

  let answers: any[] = [];
  let matchingLeft: string[] = [];
  let matchingRight: string[] = [];
  let orderingItems: string[] = [];

  if (aq.question.type === 'MATCHING') {
    const pairs = (aq.question.matchingPairs as Array<{ left: string; right: string }>) || [];
    matchingLeft = shuffleArray(pairs.map((p) => p.left));
    matchingRight = shuffleArray(pairs.map((p) => p.right));
  } else if (aq.question.type === 'ORDERING') {
    orderingItems = shuffleArray((aq.question.orderingItems as string[]) || []);
  } else {
    const answersMap = new Map(aq.question.answers.map((a) => [a.id, a.text]));
    answers = (aq.answerOrder as string[])
      .map((answerId) => {
        const text = answersMap.get(answerId);
        return text ? { id: answerId, text } : null;
      })
      .filter((a): a is { id: string; text: string } => a !== null);
  }

  return {
    id: aq.question.id,
    text: aq.question.text,
    type: aq.question.type,
    imageUrl: aq.question.imageUrl,
    answers,
    matchingLeft,
    matchingRight,
    orderingItems,
    timeLimitSeconds: aq.attempt.test.timerMode === 'PER_QUESTION' ? aq.question.category?.timeLimitSeconds || null : null,
    questionNumber: index + 1,
    total: aq.attempt._count.attemptQuestions,
  };
}

router.post(
  '/',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { testId } = startAttemptSchema.parse(req.body);
    const userId = req.user!.userId;

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        groups: { select: { groupId: true } },
        questions: { select: { questionId: true } },
        categoryQuotas: true,
      },
    });

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    if (test.status !== 'OPEN') {
      res.status(403).json({ error: 'Test is not open' });
      return;
    }

    const now = new Date();
    if (test.openFrom && now < test.openFrom) {
      res.status(403).json({ error: 'Test has not started yet' });
      return;
    }
    if (test.openUntil && now > test.openUntil) {
      res.status(403).json({ error: 'Test has already closed' });
      return;
    }

    const testGroupIds = test.groups.map((tg) => tg.groupId);
    const studentGroups = await prisma.userGroup.findMany({
      where: { userId, groupId: { in: testGroupIds } },
    });
    if (studentGroups.length === 0) {
      res.status(403).json({ error: 'You are not assigned to this test' });
      return;
    }

    const completedAttempts = await prisma.attempt.count({
      where: { studentId: userId, testId, finishedAt: { not: null } },
    });
    if (completedAttempts >= test.maxAttempts) {
      res.status(403).json({ error: 'Ви вже використали всі доступні спроби' });
      return;
    }

    const activeAttempt = await prisma.attempt.findFirst({
      where: { studentId: userId, testId, finishedAt: null },
    });
    if (activeAttempt) {
      res.status(409).json({ error: 'У вас вже є активна спроба', attemptId: activeAttempt.id });
      return;
    }

    let testQuestionIds = test.questions.map((tq) => tq.questionId);
    let sampledQuestionIds: string[];

    if (test.samplingMode === 'BY_CATEGORY') {
      sampledQuestionIds = await sampleByCategory(
        test.categoryQuotas.map((cq) => ({ categoryId: cq.categoryId, quota: cq.quota })),
        testQuestionIds,
        prisma
      );
    } else {
      if (testQuestionIds.length === 0) {
        const allQuestions = await prisma.question.findMany({ select: { id: true } });
        testQuestionIds = allQuestions.map(q => q.id);
      }
      sampledQuestionIds = sampleFromBank(testQuestionIds, test.questionsCount);
    }

    if (sampledQuestionIds.length === 0) {
      res.status(400).json({ error: 'У цьому тесті немає доступних питань. Зверніться до адміністратора.' });
      return;
    }

    const questionsWithAnswers = await prisma.question.findMany({
      where: { id: { in: sampledQuestionIds } },
      include: { answers: { select: { id: true } } },
    });
    const questionMap = new Map(questionsWithAnswers.map(q => [q.id, q]));

    const attempt = await prisma.attempt.create({
      data: {
        studentId: userId,
        testId,
        attemptQuestions: {
          create: sampledQuestionIds.map((questionId, index) => {
            const q = questionMap.get(questionId);
            const answerOrder = shuffleArray(q?.answers.map((a) => a.id) ?? []);
            return { questionId, orderIndex: index, answerOrder };
          }),
        },
      },
    });

    const firstQuestion = await getStudentQuestion(attempt.id, 0);

    res.status(201).json({
      attemptId: attempt.id,
      questionsTotal: sampledQuestionIds.length,
      timeLimitSec: test.timeLimitMin * 60,
      firstQuestion,
    });
  })
);

router.get(
  '/:id/question',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: true,
        attemptQuestions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: { include: { answers: { select: { id: true, text: true } } } },
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== userId) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }

    if (attempt.finishedAt) {
      const percentage = attempt.maxScore
        ? Math.round(((attempt.score ?? 0) / (attempt.maxScore ?? 0)) * 100 * 10) / 10
        : 0;
      res.json({
        finished: true,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage,
        finishReason: attempt.finishReason,
      });
      return;
    }

    if (attempt.test.timerMode === 'GLOBAL' && isTimedOut(attempt.startedAt, attempt.test.timeLimitMin)) {
      const result = await finishAttempt(id, 'TIMEOUT');
      res.json({ finished: true, ...result });
      return;
    }

    const question = await getStudentQuestion(id, attempt.currentQuestionIndex);

    res.json({
      finished: false,
      testId: attempt.testId,
      currentQuestion: question,
      questionsTotal: attempt.attemptQuestions.length,
      timeLeft:
        attempt.test.timerMode === 'GLOBAL' && attempt.test.timeLimitMin > 0
          ? Math.max(
              0,
              attempt.test.timeLimitMin * 60 -
                Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
            )
          : null,
    });
  })
);

router.post(
  '/:id/answer',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { questionId, answerIds = [], matchingPairs, orderingItems } = answerSchema.parse(req.body);

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: { select: { id: true, timerMode: true, timeLimitMin: true, showResultMode: true } },
        _count: { select: { attemptQuestions: true } },
      },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }
    if (attempt.studentId !== userId) {
      res.status(403).json({ error: 'Not your attempt' });
      return;
    }
    if (attempt.finishedAt) {
      res.status(400).json({ error: 'Attempt already finished' });
      return;
    }

    const currentAq = await prisma.attemptQuestion.findFirst({
      where: { attemptId: id, orderIndex: attempt.currentQuestionIndex },
      include: { question: { include: { answers: { select: { id: true } } } } },
    });

    if (!currentAq) {
      res.json({ done: true });
      return;
    }

    const currentIndex = attempt.currentQuestionIndex;

    if (currentAq.questionId !== questionId) {
      res.status(409).json({
        error: 'Question mismatch',
        currentIndex,
        currentQuestion: await getStudentQuestion(id, currentIndex),
      });
      return;
    }

    if (currentAq.question.type === 'MATCHING') {
      await prisma.$transaction([
        prisma.attemptQuestion.update({
          where: { id: currentAq.id },
          data: {
            answeredAt: new Date(),
            submittedAnswer: matchingPairs ? JSON.stringify(matchingPairs) : (null as any),
          },
        }),
        prisma.attempt.update({ where: { id }, data: { currentQuestionIndex: currentIndex + 1 } }),
      ]);
    } else if (currentAq.question.type === 'ORDERING') {
      await prisma.$transaction([
        prisma.attemptQuestion.update({
          where: { id: currentAq.id },
          data: {
            answeredAt: new Date(),
            submittedAnswer: orderingItems ? JSON.stringify(orderingItems) : (null as any),
          },
        }),
        prisma.attempt.update({ where: { id }, data: { currentQuestionIndex: currentIndex + 1 } }),
      ]);
    } else {
      const validAnswerIds = new Set(currentAq.question.answers.map((a) => a.id));
      for (const answerId of answerIds) {
        if (!validAnswerIds.has(answerId)) {
          res.status(400).json({ error: `Invalid answer ID: ${answerId}` });
          return;
        }
      }

      const selectedSet = new Set(answerIds);

      await prisma.$transaction([
        prisma.attemptAnswer.deleteMany({ where: { attemptQuestionId: currentAq.id } }),
        prisma.attemptAnswer.createMany({
          data: currentAq.question.answers.map((a) => ({
            attemptQuestionId: currentAq.id,
            answerId: a.id,
            selected: selectedSet.has(a.id),
          })),
        }),
        prisma.attemptQuestion.update({ where: { id: currentAq.id }, data: { answeredAt: new Date() } }),
        prisma.attempt.update({ where: { id }, data: { currentQuestionIndex: currentIndex + 1 } }),
      ]);
    }

    const showResultMode = (attempt.test as any).showResultMode;

    if ((attempt.test as any).timerMode === 'GLOBAL' && isTimedOut(attempt.startedAt, (attempt.test as any).timeLimitMin)) {
      const { score, maxScore } = await finishAttempt(id, 'TIMEOUT');
      res.json(
        showResultMode === 'ADMIN_ONLY'
          ? { finished: true, reason: 'TIMEOUT', showResultMode: 'ADMIN_ONLY' }
          : { finished: true, reason: 'TIMEOUT', score, maxScore }
      );
      return;
    }

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= attempt._count.attemptQuestions;

    if (isComplete) {
      const result = await finishAttempt(id, 'NORMAL');
      res.json(
        showResultMode === 'ADMIN_ONLY'
          ? { finished: true, showResultMode: 'ADMIN_ONLY' }
          : { finished: true, ...result }
      );
      return;
    }

    const nextQuestion = await getStudentQuestion(id, nextIndex);
    res.json({
      finished: false,
      nextQuestion,
      timeLeft:
        (attempt.test as any).timerMode === 'GLOBAL' && attempt.test.timeLimitMin > 0
          ? Math.max(
              0,
              attempt.test.timeLimitMin * 60 -
                Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
            )
          : null,
    });
  })
);

router.post(
  '/:id/finish',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { test: { select: { showResultMode: true, timeLimitMin: true } } },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }
    if (attempt.studentId !== userId) {
      res.status(403).json({ error: 'Not your attempt' });
      return;
    }
    if (attempt.finishedAt) {
      res.status(400).json({ error: 'Attempt already finished' });
      return;
    }

    const reason = isTimedOut(attempt.startedAt, attempt.test.timeLimitMin) ? 'TIMEOUT' : 'EXIT';
    const result = await finishAttempt(id, reason);

    res.json(
      result.showResultMode === 'ADMIN_ONLY'
        ? { showResultMode: 'ADMIN_ONLY' }
        : result
    );
  })
);

router.get(
  '/:id/result',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user!;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }
    if (user.role === 'STUDENT' && attempt.studentId !== user.userId) {
      res.status(403).json({ error: 'Not your attempt' });
      return;
    }
    if (!attempt.finishedAt) {
      res.status(400).json({ error: 'Attempt not yet finished' });
      return;
    }

    if (user.role === 'STUDENT' && attempt.test.showResultMode === 'ADMIN_ONLY') {
      res.json({
        attemptId: attempt.id,
        testId: attempt.testId,
        testTitle: attempt.test.title,
        finishedAt: attempt.finishedAt,
        showResultMode: 'ADMIN_ONLY',
      });
      return;
    }

    const s = attempt.score ?? 0;
    const ms = attempt.maxScore ?? 0;
    const percentage = ms > 0 ? Math.round((s / ms) * 100 * 100) / 100 : 0;

    const passed =
      attempt.test.passThreshold !== null
        ? attempt.test.scoringMode === 'PERCENTAGE'
          ? percentage >= attempt.test.passThreshold
          : s >= attempt.test.passThreshold
        : null;

    res.json({
      attemptId: attempt.id,
      student: attempt.student,
      testId: attempt.testId,
      testTitle: attempt.test.title,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      finishReason: attempt.finishReason,
      timeSpentSec: Math.round((attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 1000),
      score: s,
      maxScore: ms,
      percentage,
      passed,
      passThreshold: attempt.test.passThreshold,
      scoringMode: attempt.test.scoringMode,
      showResultMode: attempt.test.showResultMode,
    });
  })
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.attempt.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
