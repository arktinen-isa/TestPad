import { scoreQuestion, scoreAttempt, QuestionData, AttemptQuestionData } from '../scoringService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSingleQuestion(weight: number, correctId: string, otherIds: string[]): QuestionData {
  return {
    type: 'SINGLE',
    category: { pointsWeight: weight },
    answers: [
      { id: correctId, isCorrect: true },
      ...otherIds.map((id) => ({ id, isCorrect: false })),
    ],
  };
}

function makeMultiQuestion(
  weight: number,
  correctIds: string[],
  wrongIds: string[]
): QuestionData {
  return {
    type: 'MULTI',
    category: { pointsWeight: weight },
    answers: [
      ...correctIds.map((id) => ({ id, isCorrect: true })),
      ...wrongIds.map((id) => ({ id, isCorrect: false })),
    ],
  };
}

// ---------------------------------------------------------------------------
// scoreQuestion — SINGLE type
// ---------------------------------------------------------------------------

describe('scoreQuestion — SINGLE type', () => {
  const weight = 3;
  // correct: 'c1', wrong: 'w1', 'w2'
  const q = makeSingleQuestion(weight, 'c1', ['w1', 'w2']);

  test('correct answer selected → returns pointsWeight', () => {
    expect(scoreQuestion(q, ['c1'], 'ALL_OR_NOTHING')).toBe(weight);
  });

  test('wrong answer selected → returns 0', () => {
    expect(scoreQuestion(q, ['w1'], 'ALL_OR_NOTHING')).toBe(0);
  });

  test('multiple answers selected (one correct, one wrong) → returns 0', () => {
    expect(scoreQuestion(q, ['c1', 'w1'], 'ALL_OR_NOTHING')).toBe(0);
  });

  test('no answers selected → returns 0', () => {
    expect(scoreQuestion(q, [], 'ALL_OR_NOTHING')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreQuestion — MULTI type, ALL_OR_NOTHING
// ---------------------------------------------------------------------------

describe('scoreQuestion — MULTI type, ALL_OR_NOTHING', () => {
  const weight = 4;
  // correct: 'c1', 'c2'; wrong: 'w1'
  const q = makeMultiQuestion(weight, ['c1', 'c2'], ['w1']);

  test('all correct selected, none wrong → returns pointsWeight', () => {
    expect(scoreQuestion(q, ['c1', 'c2'], 'ALL_OR_NOTHING')).toBe(weight);
  });

  test('all correct selected, plus one wrong → returns 0', () => {
    expect(scoreQuestion(q, ['c1', 'c2', 'w1'], 'ALL_OR_NOTHING')).toBe(0);
  });

  test('only partial correct selected → returns 0', () => {
    expect(scoreQuestion(q, ['c1'], 'ALL_OR_NOTHING')).toBe(0);
  });

  test('none selected → returns 0', () => {
    expect(scoreQuestion(q, [], 'ALL_OR_NOTHING')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreQuestion — MULTI type, PARTIAL
// ---------------------------------------------------------------------------

describe('scoreQuestion — MULTI type, PARTIAL', () => {
  const weight = 4;
  // correct: 'c1', 'c2'; wrong: 'w1', 'w2'
  const q = makeMultiQuestion(weight, ['c1', 'c2'], ['w1', 'w2']);
  const totalCorrect = 2;

  test('all correct, no wrong → full score', () => {
    // (2 - 0) / 2 * 4 = 4
    expect(scoreQuestion(q, ['c1', 'c2'], 'PARTIAL')).toBe(weight);
  });

  test('half correct, no wrong → 0.5 * weight', () => {
    // (1 - 0) / 2 * 4 = 2
    expect(scoreQuestion(q, ['c1'], 'PARTIAL')).toBe(0.5 * weight);
  });

  test('half correct, one wrong → (0.5 - 1/totalCorrect) * weight clamped to 0 if negative', () => {
    // (1 - 1) / 2 * 4 = 0
    const expected = Math.max(0, ((1 - 1) / totalCorrect) * weight);
    expect(scoreQuestion(q, ['c1', 'w1'], 'PARTIAL')).toBe(expected);
  });

  test('all wrong → 0 (clamped)', () => {
    // (0 - 2) / 2 * 4 = -4, clamped to 0
    expect(scoreQuestion(q, ['w1', 'w2'], 'PARTIAL')).toBe(0);
  });

  test('more wrong than correct → 0 (never negative)', () => {
    // select 1 correct + 2 wrong => (1 - 2) / 2 * 4 = -2, clamped to 0
    expect(scoreQuestion(q, ['c1', 'w1', 'w2'], 'PARTIAL')).toBe(0);
  });

  test('question with zero correct answers in PARTIAL mode → 0', () => {
    // Edge case: a MULTI question that has no correct answers defined
    const noCorrectQ: QuestionData = {
      type: 'MULTI',
      category: { pointsWeight: 5 },
      answers: [
        { id: 'w1', isCorrect: false },
        { id: 'w2', isCorrect: false },
      ],
    };
    expect(scoreQuestion(noCorrectQ, ['w1'], 'PARTIAL')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreAttempt
// ---------------------------------------------------------------------------

describe('scoreAttempt', () => {
  test('empty questions → {score: 0, maxScore: 0}', () => {
    expect(scoreAttempt([], 'ALL_OR_NOTHING')).toEqual({ score: 0, maxScore: 0 });
  });

  test('mix of single and multi questions → sums correctly', () => {
    // Single question: weight 3, answer c1; student selects c1 correctly → earns 3
    const singleQ = makeSingleQuestion(3, 'c1', ['w1']);
    // Multi ALL_OR_NOTHING question: weight 4, correct: c2, c3; student selects only c2 → earns 0
    const multiQ = makeMultiQuestion(4, ['c2', 'c3'], ['w2']);

    const attemptQuestions: AttemptQuestionData[] = [
      {
        question: singleQ,
        attemptAnswers: [
          { answerId: 'c1', selected: true },
          { answerId: 'w1', selected: false },
        ],
      },
      {
        question: multiQ,
        attemptAnswers: [
          { answerId: 'c2', selected: true },
          { answerId: 'c3', selected: false },
          { answerId: 'w2', selected: false },
        ],
      },
    ];

    expect(scoreAttempt(attemptQuestions, 'ALL_OR_NOTHING')).toEqual({ score: 3, maxScore: 7 });
  });

  test('maxScore = sum of all question weights regardless of answers', () => {
    // Both questions answered completely wrong; maxScore should still be the total weight
    const q1 = makeSingleQuestion(5, 'c1', ['w1']);
    const q2 = makeMultiQuestion(6, ['c2', 'c3'], ['w2']);

    const attemptQuestions: AttemptQuestionData[] = [
      {
        question: q1,
        attemptAnswers: [
          { answerId: 'c1', selected: false },
          { answerId: 'w1', selected: true },  // wrong answer selected
        ],
      },
      {
        question: q2,
        attemptAnswers: [
          { answerId: 'c2', selected: false },
          { answerId: 'c3', selected: false },
          { answerId: 'w2', selected: true },  // wrong answer selected
        ],
      },
    ];

    const result = scoreAttempt(attemptQuestions, 'ALL_OR_NOTHING');
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(11);
  });

  test('PARTIAL multi mode sums partial scores correctly', () => {
    // Multi PARTIAL: weight 4, correct: c1, c2; student selects c1 only → (1-0)/2 * 4 = 2
    const q = makeMultiQuestion(4, ['c1', 'c2'], ['w1']);

    const attemptQuestions: AttemptQuestionData[] = [
      {
        question: q,
        attemptAnswers: [
          { answerId: 'c1', selected: true },
          { answerId: 'c2', selected: false },
          { answerId: 'w1', selected: false },
        ],
      },
    ];

    expect(scoreAttempt(attemptQuestions, 'PARTIAL')).toEqual({ score: 2, maxScore: 4 });
  });
});
