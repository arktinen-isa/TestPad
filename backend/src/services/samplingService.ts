import { PrismaClient } from '@prisma/client';

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 * Uses Map-based swaps to avoid bracket-notation variable-index access.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const map = new Map<number, T>(arr.map((v, i) => [i, v]));
  for (let i = map.size - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const vi = map.get(i) as T;
    const vj = map.get(j) as T;
    map.set(i, vj);
    map.set(j, vi);
  }
  return Array.from(map.values());
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
    // Find active questions in this category. 
    // Filter by test bank ONLY if the test bank actually has questions.
    const questions = await db.question.findMany({
      where: {
        categoryId,
        ...(testQuestionIds.length > 0 ? { id: { in: testQuestionIds } } : {}),
      },
      select: { id: true },
    });

    const eligible = questions
      .map((q) => q.id)
      .filter((id) => testQuestionIds.length === 0 || testQuestionSet.has(id));
    const picked = sampleFromBank(eligible, quota);
    sampled.push(...picked);
  }

  return fisherYatesShuffle(sampled);
}
