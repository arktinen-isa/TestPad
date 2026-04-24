import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import apiClient from '../api/client'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Паролі не збігаються' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Пароль має бути не менше 6 символів' })
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      await apiClient.patch(`/users/${user?.id}`, { password })
      setMessage({ type: 'success', text: 'Пароль успішно змінено' })
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Помилка при зміні пароля',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Профіль</h1>
        <p className="text-slate-400 text-sm">Керування вашим обліковим записом</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Інформація</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Ім'я</label>
            <p className="text-white font-medium">{user?.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <p className="text-white font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Роль</label>
            <span className="status-badge bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Зміна пароля</h2>
        
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Новий пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass-input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Підтвердження пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="glass-input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? 'Оновлення...' : 'Оновити пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
