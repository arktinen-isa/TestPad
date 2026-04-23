import { create } from 'zustand'
import apiClient from '../api/client'
import { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
  setUser: (user: User) => void
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  init: () => {
    const accessToken = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, accessToken })
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
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
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Невірний email або пароль'
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

  clearError: () => set({ error: null }),
}))
