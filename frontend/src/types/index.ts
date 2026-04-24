export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'
export type QuestionType = 'SINGLE' | 'MULTI'
export type TestStatus = 'DRAFT' | 'OPEN' | 'CLOSED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  groupId?: string
  group?: Group
}

export interface Group {
  id: string
  name: string
  year?: number
  studentsCount?: number
  students?: User[]
}

export interface Category {
  id: string
  name: string
  pointsWeight: number
  questionCount?: number
}

export interface Answer {
  id: string
  text: string
  isCorrect?: boolean
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  categoryId: string
  category?: Category
  imageUrl?: string
  answers: Answer[]
}

export interface CategoryQuota {
  categoryId: string
  quota: number
}

export interface Test {
  id: string
  title: string
  subject?: string
  timeLimitMin: number
  maxAttempts: number
  openFrom?: string
  openUntil?: string
  status: TestStatus
  questionsCount: number
  samplingMode: string
  scoringMode: string
  passThreshold?: number
  showResultMode: string
  multiScoringMode: string
  createdAt: string
  groups?: Group[]
  categoryQuotas?: CategoryQuota[]
}

export interface AttemptResult {
  id: string
  score: number
  maxScore: number
  percentage: number
  passed?: boolean
  finishedAt: string
  timeSpentSec?: number
  testTitle?: string
}

export interface CurrentQuestion {
  questionNumber: number
  total: number
  id: string
  text: string
  type: QuestionType
  imageUrl?: string
  answers: { id: string; text: string }[]
}

export interface TestAttempt {
  id: string
  testId: string
  userId: string
  attemptNumber: number
  startedAt: string
  finishedAt?: string
  score?: number
  maxScore?: number
  percentage?: number
  passed?: boolean
  timeSpentSec?: number
  user?: User
  test?: Test
  suspiciousEvents?: SuspiciousEvent[]
}

export interface SuspiciousEvent {
  id: string
  attemptId: string
  eventType: string
  occurredAt: string
}

export interface StudentTest {
  id: string
  title: string
  subject?: string
  status: TestStatus
  timeLimitMin: number
  maxAttempts: number
  attemptsUsed: number
  openFrom?: string
  openUntil?: string
  questionsCount: number
  passThreshold?: number
  lastAttempt?: AttemptResult
}

export interface DashboardStats {
  totalTests: number
  totalStudents: number
  totalQuestions: number
  activeTests: Test[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
