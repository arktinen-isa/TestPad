import { sampleFromBank, sampleByCategory, CategoryQuota } from '../samplingService';

// ---------------------------------------------------------------------------
// sampleFromBank
// ---------------------------------------------------------------------------

describe('sampleFromBank', () => {
  const pool = ['q1', 'q2', 'q3', 'q4', 'q5'];

  test('returns exactly N items', () => {
    const result = sampleFromBank(pool, 3);
    expect(result).toHaveLength(3);
  });

  test('all returned items come from the original pool', () => {
    const result = sampleFromBank(pool, 3);
    for (const id of result) {
      expect(pool).toContain(id);
    }
  });

  test('returns all items if N >= pool size', () => {
    const resultEqual = sampleFromBank(pool, 5);
    expect(resultEqual).toHaveLength(5);
    expect([...resultEqual].sort()).toEqual([...pool].sort());

    const resultOver = sampleFromBank(pool, 100);
    expect(resultOver).toHaveLength(5);
    expect([...resultOver].sort()).toEqual([...pool].sort());
  });

  test('returns empty array for count 0', () => {
    expect(sampleFromBank(pool, 0)).toEqual([]);
  });

  test('returns empty array for empty pool', () => {
    expect(sampleFromBank([], 3)).toEqual([]);
  });

  test('returns shuffled — not always the same order (multiple runs)', () => {
    // With a pool of 10 items and 10 samples, the chance all 10 runs produce
    // the same ordering as the original is (1/10!)^10 ≈ 0 — statistically safe.
    const largPool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const ordersSet = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ordersSet.add(sampleFromBank(largPool, largPool.length).join(','));
    }
    // At least two distinct orderings must appear across 20 runs
    expect(ordersSet.size).toBeGreaterThan(1);
  });

  test('original array is not mutated', () => {
    const original = ['q1', 'q2', 'q3', 'q4', 'q5'];
    const snapshot = [...original];
    sampleFromBank(original, 3);
    expect(original).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// sampleByCategory (with mocked PrismaClient)
// ---------------------------------------------------------------------------

function makePrismaMock(
  categoryMap: Record<string, string[]>
): { question: { findMany: jest.Mock } } {
  return {
    question: {
      findMany: jest.fn(({ where }: { where: { categoryId: string } }) => {
        const ids = categoryMap[where.categoryId] ?? [];
        return Promise.resolve(ids.map((id: string) => ({ id })));
      }),
    },
  };
}

describe('sampleByCategory', () => {
  test('each category gets exactly its quota', async () => {
    // Category A has 5 questions, quota 2; category B has 5 questions, quota 3
    const categoryMap: Record<string, string[]> = {
      catA: ['a1', 'a2', 'a3', 'a4', 'a5'],
      catB: ['b1', 'b2', 'b3', 'b4', 'b5'],
    };
    const allIds = [...categoryMap.catA, ...categoryMap.catB];
    const quotas: CategoryQuota[] = [
      { categoryId: 'catA', quota: 2 },
      { categoryId: 'catB', quota: 3 },
    ];

    const db = makePrismaMock(categoryMap) as any;
    const result = await sampleByCategory(quotas, allIds, db);

    // Total returned = 2 + 3 = 5
    expect(result).toHaveLength(5);

    // All returned IDs belong to the full pool
    for (const id of result) {
      expect(allIds).toContain(id);
    }
  });

  test('if quota > available questions, returns all available (no error)', async () => {
    // Category has only 2 questions but quota is 10
    const categoryMap: Record<string, string[]> = {
      catA: ['a1', 'a2'],
    };
    const allIds = ['a1', 'a2'];
    const quotas: CategoryQuota[] = [{ categoryId: 'catA', quota: 10 }];

    const db = makePrismaMock(categoryMap) as any;
    const result = await sampleByCategory(quotas, allIds, db);

    // Should return all 2, not throw
    expect(result).toHaveLength(2);
    expect([...result].sort()).toEqual(['a1', 'a2']);
  });

  test('returns flat array of question IDs (strings)', async () => {
    const categoryMap: Record<string, string[]> = {
      catA: ['a1', 'a2', 'a3'],
      catB: ['b1', 'b2'],
    };
    const allIds = [...categoryMap.catA, ...categoryMap.catB];
    const quotas: CategoryQuota[] = [
      { categoryId: 'catA', quota: 2 },
      { categoryId: 'catB', quota: 2 },
    ];

    const db = makePrismaMock(categoryMap) as any;
    const result = await sampleByCategory(quotas, allIds, db);

    // Result is a flat array of strings
    expect(Array.isArray(result)).toBe(true);
    for (const id of result) {
      expect(typeof id).toBe('string');
    }
    // 2 from catA + 2 from catB = 4
    expect(result).toHaveLength(4);
  });

  test('questions not in testQuestionIds are excluded even if DB returns them', async () => {
    // DB returns a1, a2, a3 for catA, but only a1 and a2 are in the test bank
    const categoryMap: Record<string, string[]> = {
      catA: ['a1', 'a2', 'a3'],
    };
    const testBankIds = ['a1', 'a2']; // a3 not in bank
    const quotas: CategoryQuota[] = [{ categoryId: 'catA', quota: 3 }];

    const db = makePrismaMock(categoryMap) as any;
    const result = await sampleByCategory(quotas, testBankIds, db);

    // Only a1 and a2 are eligible, so at most 2 returned
    expect(result).toHaveLength(2);
    expect(result).not.toContain('a3');
  });

  test('empty quotas array → returns empty array', async () => {
    const db = makePrismaMock({}) as any;
    const result = await sampleByCategory([], [], db);
    expect(result).toEqual([]);
  });

  test('prisma is called once per category', async () => {
    const categoryMap: Record<string, string[]> = {
      catA: ['a1', 'a2'],
      catB: ['b1'],
      catC: ['c1', 'c2', 'c3'],
    };
    const allIds = [...categoryMap.catA, ...categoryMap.catB, ...categoryMap.catC];
    const quotas: CategoryQuota[] = [
      { categoryId: 'catA', quota: 1 },
      { categoryId: 'catB', quota: 1 },
      { categoryId: 'catC', quota: 2 },
    ];

    const db = makePrismaMock(categoryMap) as any;
    await sampleByCategory(quotas, allIds, db);

    expect(db.question.findMany).toHaveBeenCalledTimes(3);
  });
});
