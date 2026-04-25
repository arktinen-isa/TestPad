import { create } from 'zustand'
import apiClient from '../api/client'
import { getApiError } from '../api/errors'
import { CurrentQuestion } from '../types'

interface TestState {
  attemptId: string | null
  testId: string | null
  currentQuestion: CurrentQuestion | null
  timeLeft: number
  isFinished: boolean
  score: number | null
  maxScore: number | null
  percentage: number | null
  passed: boolean | null
  passThreshold: number | null
  scoringMode: string | null
  isLoading: boolean
  error: string | null
}

interface TestActions {
  startAttempt: (testId: string) => Promise<string>
  resumeAttempt: (attemptId: string) => Promise<void>
  submitAnswer: (attemptId: string, questionId: string, answerIds: string[]) => Promise<void>
  finishAttempt: (attemptId: string) => Promise<void>
  tick: () => void
  setTimeLeft: (seconds: number) => void
  reset: () => void
}

type TestStore = TestState & TestActions

const initialState: TestState = {
  attemptId: null,
  testId: null,
  currentQuestion: null,
  timeLeft: 0,
  isFinished: false,
  score: null,
  maxScore: null,
  percentage: null,
  passed: null,
  passThreshold: null,
  scoringMode: null,
  isLoading: false,
  error: null,
}

export const useTestStore = create<TestStore>((set, get) => ({
  ...initialState,

  startAttempt: async (testId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post('/attempts', { testId })
      const { attemptId, firstQuestion, timeLimitSec } = response.data

      set({
        attemptId,
        testId,
        currentQuestion: firstQuestion,
        timeLeft: timeLimitSec,
        isFinished: false,
        isLoading: false,
        score: null,
        maxScore: null,
        percentage: null,
      })

      return attemptId as string
    } catch (error: any) {
      if (error.response?.status === 409) {
        const activeAttemptId = error.response.data.attemptId;
        if (activeAttemptId) {
          await get().resumeAttempt(activeAttemptId);
          return activeAttemptId;
        }
      }
      const message = getApiError(error, 'Помилка при старті тесту')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  resumeAttempt: async (attemptId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get(`/attempts/${attemptId}/question`)
      const { testId, currentQuestion, timeLeft, finished, score, maxScore, percentage, passed } = response.data

      if (finished) {
        set({
          attemptId,
          testId,
          isFinished: true,
          score,
          maxScore,
          percentage,
          passed,
          currentQuestion: null,
          isLoading: false
        })
      } else {
        set({
          attemptId,
          testId,
          currentQuestion,
          timeLeft: timeLeft || 0,
          isFinished: false,
          isLoading: false
        })
      }
    } catch (error: any) {
      const message = getApiError(error, 'Помилка при відновленні спроби')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  submitAnswer: async (attemptId: string, questionId: string, answerIds: string[]) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(`/attempts/${attemptId}/answer`, {
        questionId,
        answerIds,
      })

      const { nextQuestion, finished, timeLeft, score, maxScore, percentage, passed } = response.data

      if (finished) {
        set({
          currentQuestion: null,
          isFinished: true,
          isLoading: false,
          score,
          maxScore,
          percentage,
          passed
        })
      } else {
        set({
          currentQuestion: nextQuestion,
          timeLeft: timeLeft ?? get().timeLeft,
          isLoading: false,
        })
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        const { currentQuestion } = error.response.data
        if (currentQuestion) {
          set({ 
            currentQuestion, 
            isLoading: false,
            error: 'Сесію оновлено. Дайте відповідь на поточне питання.'
          })
          return
        }
      }
      const message = getApiError(error, 'Помилка при відправці відповіді')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  finishAttempt: async (attemptId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(`/attempts/${attemptId}/finish`)
      const { score, maxScore, percentage, passed, passThreshold, scoringMode } = response.data

      set({
        isFinished: true,
        score,
        maxScore,
        percentage,
        passed,
        passThreshold,
        scoringMode,
        currentQuestion: null,
        isLoading: false,
      })
    } catch (error: unknown) {
      const message = getApiError(error, 'Помилка при завершенні тесту')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  tick: () => {
    const { timeLeft } = get()
    if (timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  setTimeLeft: (seconds: number) => {
    set({ timeLeft: seconds })
  },

  reset: () => {
    set(initialState)
  },
}))
