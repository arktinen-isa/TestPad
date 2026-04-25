import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { sampleFromBank, sampleByCategory } from '../services/samplingService';
import { scoreAttempt } from '../services/scoringService';

const router = Router();

router.use(authenticate);

const startAttemptSchema = z.object({
  testId: z.string().uuid(),
});

const answerSchema = z.object({
  answerIds: z.array(z.string().uuid()),
});

/**
 * Fisher-Yates shuffle for answer IDs
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Check if attempt has timed out. Returns true if timed out.
 */
function isTimedOut(startedAt: Date, timeLimitMin: number): boolean {
  if (timeLimitMin <= 0) return false;
  return Date.now() - startedAt.getTime() > timeLimitMin * 60 * 1000;
}

/**
 * Finish an attempt: calculate score and save.
 */
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
}> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      test: true,
      attemptQuestions: {
        include: {
          question: {
            include: {
              category: true,
              answers: true,
            },
          },
          attemptAnswers: true,
        },
      },
    },
  });

  if (!attempt) throw new Error('Attempt not found');

  const { score, maxScore } = scoreAttempt(
    attempt.attemptQuestions.map((aq) => ({
      question: {
        type: aq.question.type as 'SINGLE' | 'MULTI',
        answers: aq.question.answers.map((a) => ({
          id: a.id,
          isCorrect: a.isCorrect,
        })),
        category: {
          pointsWeight: aq.question.category.pointsWeight,
        },
      },
      attemptAnswers: aq.attemptAnswers.map((aa) => ({
        answerId: aa.answerId,
        selected: aa.selected,
      })),
    })),
    attempt.test.multiScoringMode as 'ALL_OR_NOTHING' | 'PARTIAL'
  );

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      finishedAt: new Date(),
      finishReason: reason,
      score,
      maxScore,
    },
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;
  const passed =
    attempt.test.passThreshold !== null
      ? (attempt.test.scoringMode === 'PERCENTAGE'
        ? percentage >= attempt.test.passThreshold
        : score >= attempt.test.passThreshold)
      : null;

  return { 
    score, 
    maxScore, 
    percentage, 
    passed, 
    passThreshold: attempt.test.passThreshold, 
    scoringMode: attempt.test.scoringMode 
  };
}

/**
 * Format a question for the student (shuffled answers, no isCorrect info)
 */
async function getStudentQuestion(attemptId: string, index: number) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      attemptQuestions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          question: {
            include: {
              answers: { select: { id: true, text: true } },
            },
          },
        },
      },
    },
  });

  if (!attempt || index >= attempt.attemptQuestions.length) return null;

  const aq = attempt.attemptQuestions[index]!;
  const answerOrder = aq.answerOrder as string[];
  const answersMap = new Map(aq.question.answers.map((a) => [a.id, a.text]));

  const orderedAnswers = answerOrder
    .map((answerId) => {
      const text = answersMap.get(answerId);
      return text ? { id: answerId, text } : null;
    })
    .filter((a): a is { id: string; text: string } => a !== null);

  return {
    id: aq.question.id,
    text: aq.question.text,
    type: aq.question.type,
    imageUrl: aq.question.imageUrl,
    answers: orderedAnswers,
    questionNumber: index + 1,
    total: attempt.attemptQuestions.length,
  };
}

// POST /api/attempts — STUDENT only
router.post(
  '/',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { testId } = startAttemptSchema.parse(req.body);
    const userId = req.user!.userId;

    // Fetch test with all needed relations
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

    // Validate test is open
    if (test.status !== 'OPEN') {
      res.status(403).json({ error: 'Test is not open' });
      return;
    }

    // Validate time window
    const now = new Date();
    if (test.openFrom && now < test.openFrom) {
      res.status(403).json({ error: 'Test has not started yet' });
      return;
    }
    if (test.openUntil && now > test.openUntil) {
      res.status(403).json({ error: 'Test has already closed' });
      return;
    }

    // Validate student belongs to an assigned group
    const testGroupIds = test.groups.map((tg) => tg.groupId);
    const studentGroups = await prisma.userGroup.findMany({
      where: { userId, groupId: { in: testGroupIds } },
    });
    if (studentGroups.length === 0) {
      res.status(403).json({ error: 'You are not assigned to this test' });
      return;
    }

    // Check attempts remaining
    const completedAttempts = await prisma.attempt.count({
      where: { studentId: userId, testId, finishedAt: { not: null } },
    });
    if (completedAttempts >= test.maxAttempts) {
      res.status(403).json({ error: 'Maximum attempts reached' });
      return;
    }

    // Check for an active (unfinished) attempt
    const activeAttempt = await prisma.attempt.findFirst({
      where: { studentId: userId, testId, finishedAt: null },
    });
    if (activeAttempt) {
      res.status(409).json({
        error: 'You already have an active attempt',
        attemptId: activeAttempt.id,
      });
      return;
    }

    // Sample questions
    const testQuestionIds = test.questions.map((tq) => tq.questionId);
    let sampledQuestionIds: string[];

    if (test.samplingMode === 'BY_CATEGORY') {
      sampledQuestionIds = await sampleByCategory(
        test.categoryQuotas.map((cq) => ({
          categoryId: cq.categoryId,
          quota: cq.quota,
        })),
        testQuestionIds,
        prisma
      );
    } else {
      sampledQuestionIds = sampleFromBank(testQuestionIds, test.questionsCount);
    }

    // Create attempt with AttemptQuestion records
    const attempt = await prisma.attempt.create({
      data: {
        studentId: userId,
        testId,
        attemptQuestions: {
          create: await Promise.all(
            sampledQuestionIds.map(async (questionId, index) => {
              const question = await prisma.question.findUnique({
                where: { id: questionId },
                include: { answers: { select: { id: true } } },
              });
              const answerOrder = shuffleArray(
                question?.answers.map((a) => a.id) ?? []
              );
              return {
                questionId,
                orderIndex: index,
                answerOrder,
              };
            })
          ),
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

// GET /api/attempts/:id/question — STUDENT only, current question
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
            question: {
              include: {
                answers: { select: { id: true, text: true } },
              },
            },
          },
        },
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
      res.json({ done: true });
      return;
    }

    // Auto-finish if timed out
    if (isTimedOut(attempt.startedAt, attempt.test.timeLimitMin)) {
      const { score, maxScore } = await finishAttempt(id, 'TIMEOUT');
      res.json({ done: true, reason: 'TIMEOUT', score, maxScore });
      return;
    }

    const currentIndex = attempt.currentQuestionIndex;
    if (currentIndex >= attempt.attemptQuestions.length) {
      res.json({ done: true });
      return;
    }

    const aq = attempt.attemptQuestions[currentIndex]!;
    // Use answerOrder to present answers in shuffled order
    const answerOrder = aq.answerOrder as string[];
    const answersMap = new Map(aq.question.answers.map((a) => [a.id, a.text]));

    const orderedAnswers = answerOrder
      .map((answerId) => {
        const text = answersMap.get(answerId);
        if (!text) return null;
        return { id: answerId, text };
      })
      .filter((a): a is { id: string; text: string } => a !== null);

    res.json({
      attemptQuestionId: aq.id,
      questionIndex: currentIndex,
      questionsTotal: attempt.attemptQuestions.length,
      question: {
        id: aq.question.id,
        text: aq.question.text,
        type: aq.question.type,
        imageUrl: aq.question.imageUrl,
        answers: orderedAnswers,
      },
      timeRemaining: attempt.test.timeLimitMin > 0
        ? Math.max(
            0,
            attempt.test.timeLimitMin * 60 -
              Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
          )
        : null,
    });
  })
);

// POST /api/attempts/:id/answer — STUDENT only
router.post(
  '/:id/answer',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { answerIds } = answerSchema.parse(req.body);

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: true,
        attemptQuestions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: { answers: { select: { id: true } } },
            },
            attemptAnswers: true,
          },
        },
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

    // Check timeout
    if (isTimedOut(attempt.startedAt, attempt.test.timeLimitMin)) {
      const { score, maxScore } = await finishAttempt(id, 'TIMEOUT');
      res.json({ done: true, reason: 'TIMEOUT', score, maxScore });
      return;
    }

    const currentIndex = attempt.currentQuestionIndex;
    if (currentIndex >= attempt.attemptQuestions.length) {
      res.json({ done: true });
      return;
    }

    const currentAq = attempt.attemptQuestions[currentIndex]!;

    // Validate answer IDs belong to this question
    const validAnswerIds = new Set(currentAq.question.answers.map((a) => a.id));
    for (const answerId of answerIds) {
      if (!validAnswerIds.has(answerId)) {
        res.status(400).json({ error: `Invalid answer ID: ${answerId}` });
        return;
      }
    }

    const selectedSet = new Set(answerIds);

    // Upsert AttemptAnswer records for all answers of this question
    await prisma.$transaction([
      // Delete existing answers for this attempt question
      prisma.attemptAnswer.deleteMany({
        where: { attemptQuestionId: currentAq.id },
      }),
      // Create new answer records
      prisma.attemptAnswer.createMany({
        data: currentAq.question.answers.map((a) => ({
          attemptQuestionId: currentAq.id,
          answerId: a.id,
          selected: selectedSet.has(a.id),
        })),
      }),
      // Mark question as answered
      prisma.attemptQuestion.update({
        where: { id: currentAq.id },
        data: { answeredAt: new Date() },
      }),
      // Advance currentQuestionIndex
      prisma.attempt.update({
        where: { id },
        data: { currentQuestionIndex: currentIndex + 1 },
      }),
    ]);

    // Check if this was the last question
    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= attempt.attemptQuestions.length;

    if (isComplete) {
      const result = await finishAttempt(id, 'NORMAL');
      res.json({ finished: true, ...result });
      return;
    }

    const nextQuestion = await getStudentQuestion(id, nextIndex);
    res.json({
      finished: false,
      nextQuestion,
      timeLeft: attempt.test.timeLimitMin > 0
        ? Math.max(
            0,
            attempt.test.timeLimitMin * 60 -
              Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
          )
        : null,
    });
  })
);

// POST /api/attempts/:id/finish — STUDENT only, force finish
router.post(
  '/:id/finish',
  authorize('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const attempt = await prisma.attempt.findUnique({ where: { id } });

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

    const result = await finishAttempt(id, 'EXIT');
    res.json({ done: true, ...result });
  })
);

// GET /api/attempts/:id/result
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

    // Authorization: student can only see their own attempt; admin/teacher can see all
    if (user.role === 'STUDENT' && attempt.studentId !== user.userId) {
      res.status(403).json({ error: 'Not your attempt' });
      return;
    }

    if (!attempt.finishedAt) {
      res.status(400).json({ error: 'Attempt not yet finished' });
      return;
    }

    // Respect showResultMode
    const showResultMode = attempt.test.showResultMode;

    if (user.role === 'STUDENT') {
      if (showResultMode === 'ADMIN_ONLY') {
        res.status(403).json({ error: 'Results are not available to students' });
        return;
      }
    }

    const s = attempt.score ?? 0;
    const ms = attempt.maxScore ?? 0;
    const percentage = ms > 0 ? Math.round((s / ms) * 100 * 100) / 100 : 0;
    
    let passed = null;
    if (attempt.test.passThreshold !== null && attempt.finishedAt !== null) {
      passed = attempt.test.scoringMode === 'PERCENTAGE'
        ? percentage >= attempt.test.passThreshold
        : s >= attempt.test.passThreshold;
    }

    res.json({
      attemptId: attempt.id,
      student: attempt.student,
      testId: attempt.testId,
      testTitle: attempt.test.title,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      finishReason: attempt.finishReason,
      score: s,
      maxScore: ms,
      percentage,
      passed,
      passThreshold: attempt.test.passThreshold,
      scoringMode: attempt.test.scoringMode,
      suspiciousEventsCount: attempt.suspiciousEventsCount,
    });
  })
);

export default router;
