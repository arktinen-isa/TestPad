import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const Role = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const QuestionType = {
  SINGLE: 'SINGLE',
  MULTI: 'MULTI',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const TestStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type TestStatus = (typeof TestStatus)[keyof typeof TestStatus];

export const SamplingMode = {
  FROM_BANK: 'FROM_BANK',
  BY_CATEGORY: 'BY_CATEGORY',
} as const;
export type SamplingMode = (typeof SamplingMode)[keyof typeof SamplingMode];

export const ScoringMode = {
  SUM: 'SUM',
  PERCENTAGE: 'PERCENTAGE',
} as const;
export type ScoringMode = (typeof ScoringMode)[keyof typeof ScoringMode];

export const ShowResultMode = {
  AFTER_FINISH: 'AFTER_FINISH',
  ADMIN_ONLY: 'ADMIN_ONLY',
  AFTER_TEST_CLOSED: 'AFTER_TEST_CLOSED',
} as const;
export type ShowResultMode = (typeof ShowResultMode)[keyof typeof ShowResultMode];

export const MultiScoringMode = {
  ALL_OR_NOTHING: 'ALL_OR_NOTHING',
  PARTIAL: 'PARTIAL',
} as const;
export type MultiScoringMode = (typeof MultiScoringMode)[keyof typeof MultiScoringMode];

export const FinishReason = {
  NORMAL: 'NORMAL',
  TIMEOUT: 'TIMEOUT',
  EXIT: 'EXIT',
} as const;
export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason];

export const SuspiciousEventType = {
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  TAB_SWITCH: 'TAB_SWITCH',
} as const;
export type SuspiciousEventType = (typeof SuspiciousEventType)[keyof typeof SuspiciousEventType];

// Re-export for convenience
export type { Request };
