import { MultiScoringMode } from '../types';

export interface AnswerData {
  id: string;
  isCorrect: boolean;
}

export interface QuestionData {
  type: 'SINGLE' | 'MULTI';
  answers: AnswerData[];
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
}

/**
 * Score a single question based on selected answer IDs.
 * Returns points earned (0 to pointsWeight).
 */
export function scoreQuestion(
  question: QuestionData,
  selectedAnswerIds: string[],
  multiMode: 'ALL_OR_NOTHING' | 'PARTIAL'
): number {
  const weight = question.category.pointsWeight;
  const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id));
  const selected = new Set(selectedAnswerIds);

  if (question.type === 'SINGLE') {
    // Full points if exactly the one correct answer selected
    if (correctIds.size === 1) {
      const [correctId] = correctIds;
      if (selected.has(correctId) && selected.size === 1) {
        return weight;
      }
    }
    return 0;
  }

  // MULTI question
  if (multiMode === MultiScoringMode.ALL_OR_NOTHING) {
    // Full points only if all correct selected and no wrong selected
    const allCorrectSelected = [...correctIds].every((id) => selected.has(id));
    const noWrongSelected = [...selected].every((id) => correctIds.has(id));
    return allCorrectSelected && noWrongSelected ? weight : 0;
  }

  // PARTIAL scoring
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

    score += scoreQuestion(aq.question, selectedIds, multiMode);
  }

  return { score, maxScore };
}
