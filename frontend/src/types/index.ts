export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'
export type QuestionType = 'SINGLE' | 'MULTI' | 'MATCHING' | 'ORDERING'

export interface Question {
  id: string
  text: string
  type: QuestionType
  categoryId: string
  category?: Category
  imageUrl?: string
  answers: Answer[]
  // New fields for matching and ordering question types
  matchingPairs?: { left: string; right: string }[]
  orderingItems?: string[]
  // Optional per‑question time limit in seconds
  timeLimitSeconds?: number
}

export type TestStatus = 'DRAFT' | 'OPEN' | 'CLOSED'
export type FormFieldType = 'TEXT' | 'BOOLEAN' | 'INTEGER' | 'FLOAT'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  groups?: { group: { id: string, name: string } }[]
}

export interface Group {
  id: string
  name: string
  studentCount?: number
  students?: User[]
}

export interface Category {
  id: string
  name: string
  pointsWeight: number
  timeLimitSeconds?: number | null
  questionCount?: number
}

export interface Answer {
  id: string
  text: string
  isCorrect?: boolean
}



export interface CategoryQuota {
  categoryId: string
  quota: number
}

export interface Test {
  id: string
  title: string
  subject?: string
  timerMode: 'GLOBAL' | 'PER_QUESTION'
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
  allowCertificate: boolean
  logoUrl?: string
  groups?: { groupId: string; group: Group }[]
  categoryQuotas?: (CategoryQuota & { category?: Category })[]
}

export interface AttemptResult {
  id: string
  score: number | null
  maxScore: number | null
  percentage: number
  passed?: boolean | null
  finishedAt: string | null
  timeSpentSec?: number
  testTitle?: string
  passThreshold?: number | null
  scoringMode?: string
  finishReason?: string | null
  showResultMode?: string
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
  finishReason?: string | null
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
  scoringMode: string
  passThreshold?: number
  showResultMode: string
  allowCertificate: boolean
  logoUrl?: string
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

export interface Form {
  id: string
  title: string
  description?: string
  createdById: string
  createdAt: string
  status: TestStatus
  groupId?: string | null
  openFrom?: string | null
  openUntil?: string | null
  group?: { id: string; name: string } | null
  fields?: FormField[]
  _count?: { submissions: number; fields: number }
}

export interface FormField {
  id: string
  formId: string
  label: string
  type: FormFieldType
  order: number
  required: boolean
  correctAnswer?: string | null
}

export interface FormSubmission {
  id: string
  formId: string
  userId: string
  submittedAt: string
  user?: User
  values?: FormFieldValue[]
}

export interface FormFieldValue {
  id: string
  submissionId: string
  fieldId: string
  value: string
  field?: FormField
}
