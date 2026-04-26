import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { User, Role } from '../../types'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Адміністратор',
  TEACHER: 'Викладач',
  STUDENT: 'Студент',
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  TEACHER: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  STUDENT: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
}

interface UserFormData {
  name: string
  email: string
  password: string
  role: Role
}

interface UserModalProps {
  initial?: User | null
  onClose: () => void
  onSave: (data: UserFormData, id?: string) => Promise<void>
}

function UserModal({ initial, onClose, onSave }: UserModalProps) {
  const [form, setForm] = useState<UserFormData>({
    name: initial?.name || '',
    email: initial?.email || '',
    password: '',
    role: initial?.role || 'STUDENT',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSave(form, initial?.id)
      onClose()
    } catch (err: unknown) {
      setError(
        getApiError(err, 'Помилка збереження')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-lg font-bold text-white">
            {initial ? 'Редагувати користувача' : 'Додати користувача'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Ім'я</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="glass-input"
              placeholder="Іванов Іван Іванович"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="glass-input"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {initial ? 'Новий пароль (залиште пустим щоб не змінювати)' : 'Пароль'}
            </label>
            <input
              type="password"
              required={!initial}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="glass-input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Роль</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="glass-input"
            >
              <option value="STUDENT" className="bg-gray-900">Студент</option>
              <option value="TEACHER" className="bg-gray-900">Викладач</option>
              <option value="ADMIN" className="bg-gray-900">Адміністратор</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost">
              Скасувати
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-secondary disabled:opacity-50">
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users', roleFilter, debouncedSearch],
    queryFn: async () => {
      const params: any = {}
      if (roleFilter !== 'ALL') params.role = roleFilter
      if (debouncedSearch) params.search = debouncedSearch
      const res = await apiClient.get('/users', { params })
      return res.data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: UserFormData; id?: string }) => {
      if (id) {
        await apiClient.patch(`/users/${id}`, data)
      } else {
        await apiClient.post('/users', data)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteConfirm(null)
    },
  })

  const handleSave = async (data: UserFormData, id?: string) => {
    await saveMutation.mutateAsync({ data, id })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Користувачі</h1>
          <p className="text-slate-400 text-sm">Управління обліковими записами</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true) }} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати користувача
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'STUDENT', 'TEACHER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                roleFilter === r
                  ? 'bg-purple-accent/30 text-white border-purple-accent/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'Всі' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
           <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
           <input 
             type="text"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="Пошук (ПІБ або email)..."
             className="glass-input pl-10 h-10 text-sm"
           />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ім'я</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Роль</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Зареєстрований</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-accent/20 border border-purple-accent/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-purple-300">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`status-badge ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditUser(u); setShowModal(true) }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                          title="Редагувати"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                          title="Видалити"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      Користувачів не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <UserModal
          initial={editUser}
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-unbounded text-lg font-bold text-white mb-2">Видалити?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Ви впевнені, що хочете видалити користувача <strong className="text-white">{deleteConfirm.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-ghost">Скасувати</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 btn-danger disabled:opacity-50"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
