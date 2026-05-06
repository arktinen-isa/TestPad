import prisma from '../lib/prisma';
import { scoreQuestion } from './scoringService';

/**
 * Calculate Psychometrics for Questions (Difficulty & Discrimination Indices)
 * based on completed attempts for a given test.
 */
export async function calculatePsychometrics(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { musicScoringMode: true } as any // Handle potential dynamic fields
  });
  const scoringMode = (test as any)?.multiScoringMode || 'ALL_OR_NOTHING';

  const attempts = await prisma.attempt.findMany({
    where: { testId, finishedAt: { not: null } },
    orderBy: { score: 'desc' },
    include: {
      attemptQuestions: {
        include: {
          question: {
            include: {
              answers: true,
              category: { select: { pointsWeight: true } }
            }
          },
          attemptAnswers: true
        }
      }
    }
  });

  if (attempts.length === 0) return;

  const totalAttempts = attempts.length;
  // Compute bounds for high vs low performers (standard 27%)
  const bound = Math.max(1, Math.round(totalAttempts * 0.27));
  const upperGroup = attempts.slice(0, bound);
  const lowerGroup = attempts.slice(-bound);

  const questionMap: Record<string, { total: number; correct: number; upperTotal: number; upperCorrect: number; lowerTotal: number; lowerCorrect: number }> = {};

  attempts.forEach((attempt, index) => {
    const isUpper = index < bound;
    const isLower = index >= totalAttempts - bound;

    attempt.attemptQuestions.forEach(aq => {
      const qId = aq.questionId;
      if (!questionMap[qId]) {
        questionMap[qId] = { total: 0, correct: 0, upperTotal: 0, upperCorrect: 0, lowerTotal: 0, lowerCorrect: 0 };
      }

      const selectedIds = aq.attemptAnswers.filter(aa => aa.selected).map(aa => aa.answerId);
      const earnedPoints = scoreQuestion(
        {
          type: aq.question.type as any,
          answers: aq.question.answers,
          matchingPairs: aq.question.matchingPairs,
          orderingItems: aq.question.orderingItems,
          category: aq.question.category
        },
        selectedIds,
        scoringMode,
        aq.submittedAnswer as string | null
      );

      const isCorrect = earnedPoints === aq.question.category.pointsWeight;

      questionMap[qId].total++;
      if (isCorrect) questionMap[qId].correct++;

      if (isUpper) {
        questionMap[qId].upperTotal++;
        if (isCorrect) questionMap[qId].upperCorrect++;
      }
      if (isLower) {
        questionMap[qId].lowerTotal++;
        if (isCorrect) questionMap[qId].lowerCorrect++;
      }
    });
  });

  for (const [qId, stats] of Object.entries(questionMap)) {
    const difficulty = stats.total > 0 ? stats.correct / stats.total : null;
    let discrimination: number | null = null;

    if (stats.upperTotal > 0 && stats.lowerTotal > 0) {
      const pUpper = stats.upperCorrect / stats.upperTotal;
      const pLower = stats.lowerCorrect / stats.lowerTotal;
      discrimination = pUpper - pLower;
    }

    await prisma.question.update({
      where: { id: qId },
      data: {
        difficultyIndex: difficulty,
        discriminationIndex: discrimination,
        totalResponsesCount: stats.total
      }
    });
  }
}

/**
 * Increment user daily streak, award activity XP, and trigger streak badges.
 */
export async function updateDailyStreak(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const todayStr = now.toDateString();
  let xpIncrement = 15; // Base XP for active day

  if (!user.lastActiveDate) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        streakCount: 1,
        lastActiveDate: now,
        xp: { increment: xpIncrement }
      }
    });
    return;
  }

  const lastActiveStr = user.lastActiveDate.toDateString();

  if (todayStr === lastActiveStr) {
    // Already active today, award standard active XP without double-incrementing streak
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: 5 }
      }
    });
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (lastActiveStr === yesterdayStr) {
    const newStreak = user.streakCount + 1;
    xpIncrement += newStreak * 5; // Bonus multiplier for streaks

    await prisma.user.update({
      where: { id: userId },
      data: {
        streakCount: newStreak,
        lastActiveDate: now,
        xp: { increment: xpIncrement }
      }
    });

    await checkAndAwardStreakBadges(userId, newStreak);
  } else {
    // Streak broken, reset to 1
    await prisma.user.update({
      where: { id: userId },
      data: {
        streakCount: 1,
        lastActiveDate: now,
        xp: { increment: xpIncrement }
      }
    });
  }
}

async function checkAndAwardStreakBadges(userId: string, streak: number) {
  let badgeTitle = '';
  let badgeDesc = '';
  let xpBonus = 50;

  if (streak === 3) {
    badgeTitle = 'Запалений';
    badgeDesc = 'Активність протягом 3-х днів поспіль!';
    xpBonus = 50;
  } else if (streak === 7) {
    badgeTitle = 'Тижневий герой';
    badgeDesc = 'Активність протягом 7-ми днів поспіль!';
    xpBonus = 150;
  } else if (streak === 30) {
    badgeTitle = 'Легендарний';
    badgeDesc = 'Активність протягом 30-ти днів поспіль!';
    xpBonus = 500;
  }

  if (badgeTitle) {
    let badge = await prisma.badge.findFirst({ where: { title: badgeTitle } });
    if (!badge) {
      badge = await prisma.badge.create({
        data: {
          title: badgeTitle,
          description: badgeDesc,
          imageUrl: '🔥',
          xpBonus
        }
      });
    }

    const hasBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } }
    });

    if (!hasBadge) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id }
      });
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpBonus } }
      });
    }
  }
}
