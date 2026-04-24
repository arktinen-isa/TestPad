import { PrismaClient } from '@prisma/client';

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Pick `count` random question IDs from the provided pool using Fisher-Yates.
 * Returns shuffled array of selected IDs.
 */
export function sampleFromBank(questionIds: string[], count: number): string[] {
  const shuffled = fisherYatesShuffle(questionIds);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export interface CategoryQuota {
  categoryId: string;
  quota: number;
}

/**
 * For each category, pick quota questions randomly from the available
 * questions in the test bank that belong to that category.
 * Returns shuffled array of sampled question IDs.
 */
export async function sampleByCategory(
  categoryQuotas: CategoryQuota[],
  testQuestionIds: string[],
  db: PrismaClient
): Promise<string[]> {
  const testQuestionSet = new Set(testQuestionIds);
  const sampled: string[] = [];

  for (const { categoryId, quota } of categoryQuotas) {
    // Find active questions in this category that are also in the test bank
    const questions = await db.question.findMany({
      where: {
        categoryId,
        id: { in: testQuestionIds },
      },
      select: { id: true },
    });

    const eligible = questions.map((q) => q.id).filter((id) => testQuestionSet.has(id));
    const picked = sampleFromBank(eligible, quota);
    sampled.push(...picked);
  }

  return fisherYatesShuffle(sampled);
}
