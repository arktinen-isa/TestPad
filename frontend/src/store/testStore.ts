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
  isLoading: boolean
  error: string | null
}

interface TestActions {
  startAttempt: (testId: string) => Promise<string>
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
  isLoading: false,
  error: null,
}

export const useTestStore = create<TestStore>((set, get) => ({
  ...initialState,

  startAttempt: async (testId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(`/tests/${testId}/attempts`)
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
    } catch (error: unknown) {
      const message =
        getApiError(error, 'Помилка при старті тесту')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  submitAnswer: async (attemptId: string, questionId: string, answerIds: string[]) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(`/attempts/${attemptId}/answers`, {
        questionId,
        answerIds,
      })

      const { nextQuestion, finished, timeLeft } = response.data

      if (finished) {
        set({
          currentQuestion: null,
          isFinished: true,
          isLoading: false,
        })
      } else {
        set({
          currentQuestion: nextQuestion,
          timeLeft: timeLeft ?? get().timeLeft,
          isLoading: false,
        })
      }
    } catch (error: unknown) {
      const message = getApiError(error, 'Помилка при відправці відповіді')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  finishAttempt: async (attemptId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post(`/attempts/${attemptId}/finish`)
      const { score, maxScore, percentage } = response.data

      set({
        isFinished: true,
        score,
        maxScore,
        percentage,
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
