import { create } from 'zustand'
import apiClient from '../api/client'
import { getApiError } from '../api/errors'
import { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  setRefreshToken: (token: string) => void
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  init: () => {
    const accessToken = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, accessToken, isInitialized: true })
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        set({ isInitialized: true })
      }
    } else {
      set({ isInitialized: true })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.post('/auth/login', { email, password })
      const { accessToken, refreshToken, user } = response.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      set({ user, accessToken, isLoading: false, error: null })
    } catch (error: unknown) {
      const message =
        getApiError(error, 'Невірний email або пароль')
      set({ isLoading: false, error: message })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ user: null, accessToken: null, error: null })
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  setAccessToken: (token: string) => {
    localStorage.setItem('accessToken', token)
    set({ accessToken: token })
  },

  setRefreshToken: (token: string) => {
    localStorage.setItem('refreshToken', token)
  },

  clearError: () => set({ error: null }),
}))
