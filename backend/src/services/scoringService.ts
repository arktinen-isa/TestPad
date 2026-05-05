import { MultiScoringMode } from '../types';

export interface AnswerData {
  id: string;
  isCorrect: boolean;
}

export interface QuestionData {
  type: 'SINGLE' | 'MULTI' | 'MATCHING' | 'ORDERING';
  answers?: AnswerData[];
  matchingPairs?: any; // Array of { left, right }
  orderingItems?: any; // Array of strings
  category: {
    pointsWeight: number;
  };
}

export interface AttemptQuestionData {
  question: QuestionData;
  attemptAnswers: Array<{
    answerId: string;
    selected: boolean;
  }>;
  submittedAnswer?: string | null;
}

/**
 * Score a single question based on selected answer IDs or submitted answer.
 * Returns points earned (0 to pointsWeight).
 */
export function scoreQuestion(
  question: QuestionData,
  selectedAnswerIds: string[],
  multiMode: 'ALL_OR_NOTHING' | 'PARTIAL',
  submittedAnswer?: string | null
): number {
  const weight = question.category.pointsWeight;

  if (question.type === 'MATCHING') {
    const correctPairs = (question.matchingPairs as Array<{ left: string; right: string }>) || [];
    if (correctPairs.length === 0) return 0;

    let submittedPairs: Array<{ left: string; right: string }> = [];
    if (submittedAnswer) {
      try {
        submittedPairs = JSON.parse(submittedAnswer);
      } catch (e) {
        return 0;
      }
    }

    let correctMatches = 0;
    let incorrectMatches = 0;

    const correctMap = new Map(correctPairs.map((p) => [p.left, p.right]));

    for (const sub of submittedPairs) {
      if (correctMap.has(sub.left)) {
        if (correctMap.get(sub.left) === sub.right) {
          correctMatches++;
        } else {
          incorrectMatches++;
        }
      } else {
        incorrectMatches++;
      }
    }

    if (multiMode === MultiScoringMode.ALL_OR_NOTHING) {
      return correctMatches === correctPairs.length && incorrectMatches === 0 ? weight : 0;
    }

    const score = ((correctMatches - incorrectMatches) / correctPairs.length) * weight;
    return Math.max(0, score);
  }

  if (question.type === 'ORDERING') {
    const correctOrder = (question.orderingItems as string[]) || [];
    if (correctOrder.length === 0) return 0;

    let submittedOrder: string[] = [];
    if (submittedAnswer) {
      try {
        submittedOrder = JSON.parse(submittedAnswer);
      } catch (e) {
        return 0;
      }
    }

    let correctPositions = 0;
    for (let i = 0; i < correctOrder.length; i++) {
      if (submittedOrder[i] === correctOrder[i]) {
        correctPositions++;
      }
    }

    if (multiMode === MultiScoringMode.ALL_OR_NOTHING) {
      return correctPositions === correctOrder.length ? weight : 0;
    }

    const score = (correctPositions / correctOrder.length) * weight;
    return Math.max(0, score);
  }

  // Standard SINGLE/MULTI question types
  const answers = question.answers || [];
  const correctIds = new Set(answers.filter((a) => a.isCorrect).map((a) => a.id));
  const selected = new Set(selectedAnswerIds);

  if (question.type === 'SINGLE') {
    if (correctIds.size === 1) {
      const [correctId] = correctIds;
      if (selected.has(correctId) && selected.size === 1) {
        return weight;
      }
    }
    return 0;
  }

  // MULTI question type
  if (multiMode === MultiScoringMode.ALL_OR_NOTHING) {
    const allCorrectSelected = [...correctIds].every((id) => selected.has(id));
    const noWrongSelected = [...selected].every((id) => correctIds.has(id));
    return allCorrectSelected && noWrongSelected ? weight : 0;
  }

  // PARTIAL scoring for MULTI
  const totalCorrect = correctIds.size;
  if (totalCorrect === 0) return 0;

  let correctlySelected = 0;
  let wronglySelected = 0;

  for (const id of selected) {
    if (correctIds.has(id)) {
      correctlySelected++;
    } else {
      wronglySelected++;
    }
  }

  const partialScore = ((correctlySelected - wronglySelected) / totalCorrect) * weight;
  return Math.max(0, partialScore);
}

/**
 * Score all questions in an attempt.
 * Returns { score, maxScore }.
 */
export function scoreAttempt(
  attemptQuestions: AttemptQuestionData[],
  multiMode: 'ALL_OR_NOTHING' | 'PARTIAL'
): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;

  for (const aq of attemptQuestions) {
    const weight = aq.question.category.pointsWeight;
    maxScore += weight;

    const selectedIds = aq.attemptAnswers
      .filter((aa) => aa.selected)
      .map((aa) => aa.answerId);

    score += scoreQuestion(aq.question, selectedIds, multiMode, aq.submittedAnswer);
  }

  return { score, maxScore };
}
