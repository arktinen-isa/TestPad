import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { Group, User } from '../../types'
import StudentImportModal from '../../components/admin/StudentImportModal'

interface GroupFormData {
  name: string
  year?: number
}

interface GroupModalProps {
  initial?: Group | null
  onClose: () => void
  onSave: (data: GroupFormData, id?: string) => Promise<void>
}

function GroupModal({ initial, onClose, onSave }: GroupModalProps) {
  const [form, setForm] = useState<GroupFormData>({
    name: initial?.name || '',
    year: initial?.year,
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
      <div className="modal-card max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-lg font-bold text-white">
            {initial ? 'Редагувати групу' : 'Додати групу'}
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Назва групи</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="glass-input"
              placeholder="МФ-23"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Рік набору</label>
            <input
              type="number"
              value={form.year || ''}
              onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : undefined })}
              className="glass-input"
              placeholder="2023"
              min="2000"
              max="2100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost">Скасувати</button>
            <button type="submit" disabled={loading} className="flex-1 btn-secondary disabled:opacity-50">
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface StudentsModalProps {
  group: Group
  onClose: () => void
}

function StudentsModal({ group, onClose }: StudentsModalProps) {
  const qc = useQueryClient()
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const { data: students, isLoading } = useQuery<User[]>({
    queryKey: ['group-students', group.id],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${group.id}`)
      return res.data.students
    },
  })

  const { data: unassignedStudents, isLoading: isUnassignedLoading } = useQuery<User[]>({
    queryKey: ['unassigned-students'],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { unassigned: 'true', limit: 50 } })
      return res.data.data
    },
  })

  const addMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiClient.post(`/groups/${group.id}/students`, { studentId: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-students', group.id] })
      qc.invalidateQueries({ queryKey: ['unassigned-students'] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiClient.delete(`/groups/${group.id}/students/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-students', group.id] })
      qc.invalidateQueries({ queryKey: ['unassigned-students'] })
    },
  })

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      const usersRes = await apiClient.get('/users', { params: { email: addEmail } })
      const user = usersRes.data.data.find((u: any) => u.email === addEmail)
      if (!user) throw new Error('Користувача не знайдено')
      
      await addMutation.mutateAsync(user.id)
      setAddEmail('')
    } catch (err: unknown) {
      setAddError((err as any).message || 'Помилка додавання')
    } finally {
      setAddLoading(false)
    }
  }

  const handleImportStudents = async (users: any[]) => {
    await apiClient.post('/users/import', { groupId: group.id, users })
    qc.invalidateQueries({ queryKey: ['group-students', group.id] })
    qc.invalidateQueries({ queryKey: ['groups'] })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-lg font-bold text-white">
            Група: {group.name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 flex justify-end">
          <button 
            onClick={() => setShowImportModal(true)}
            className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Імпорт з Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Current students & Add by email */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Студенти в групі
              </h3>
              
              <form onSubmit={handleAddByEmail} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="email" required value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="glass-input flex-1 py-2 text-sm"
                    placeholder="Додати за email..."
                  />
                  <button type="submit" disabled={addLoading} className="btn-secondary py-2 px-3 text-xs">
                    {addLoading ? '...' : 'Додати'}
                  </button>
                </div>
                {addError && <p className="text-red-400 text-[10px] mt-1">{addError}</p>}
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="py-4 text-center"><div className="w-5 h-5 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : students && students.length > 0 ? (
                  students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-purple-accent/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-purple-300">{s.name.charAt(0)}</div>
                        <div className="truncate">
                          <p className="text-white text-xs font-medium truncate">{s.name}</p>
                          <p className="text-slate-500 text-[10px] truncate">{s.email}</p>
                        </div>
                      </div>
                      <button onClick={() => removeMutation.mutate(s.id)} className="p-1 text-slate-500 hover:text-red-400"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs text-center py-4">Студентів немає</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Unassigned students (Quick add) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              Неприв'язані студенти
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {isUnassignedLoading ? (
                <div className="py-4 text-center"><div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : unassignedStudents && unassignedStudents.length > 0 ? (
                unassignedStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-yellow-500">{s.name.charAt(0)}</div>
                      <div className="truncate">
                        <p className="text-white text-xs font-medium truncate">{s.name}</p>
                        <p className="text-slate-500 text-[10px] truncate">{s.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addMutation.mutate(s.id)}
                      disabled={addMutation.isPending}
                      className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all"
                      title="Додати до групи"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs text-center py-4">Всі студенти мають групи</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="btn-ghost">Закрити</button>
        </div>

        {showImportModal && (
          <StudentImportModal
            groupId={group.id}
            groupName={group.name}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportStudents}
          />
        )}
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [studentsGroup, setStudentsGroup] = useState<Group | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Group | null>(null)

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: GroupFormData; id?: string }) => {
      if (id) {
        await apiClient.patch(`/groups/${id}`, data)
      } else {
        await apiClient.post('/groups', data)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      setDeleteConfirm(null)
    },
  })

  const handleSave = async (data: GroupFormData, id?: string) => {
    await saveMutation.mutateAsync({ data, id })
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Групи</h1>
          <p className="text-slate-400 text-sm">Управління навчальними групами</p>
        </div>
        <button
          onClick={() => { setEditGroup(null); setShowModal(true) }}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати групу
        </button>
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
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Назва</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Рік набору</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Студентів</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody>
                {groups?.map((g) => (
                  <tr key={g.id} className="table-row">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setStudentsGroup(g)}
                        className="text-white font-medium hover:text-purple-300 transition-colors duration-200"
                      >
                        {g.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{g.year || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="status-badge bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {g.studentsCount ?? 0} студ.
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setStudentsGroup(g)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Студенти"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditGroup(g); setShowModal(true) }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Редагувати"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(g)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
                {(!groups || groups.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                      Груп не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <GroupModal
          initial={editGroup}
          onClose={() => { setShowModal(false); setEditGroup(null) }}
          onSave={handleSave}
        />
      )}

      {studentsGroup && (
        <StudentsModal
          group={studentsGroup}
          onClose={() => setStudentsGroup(null)}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm text-center">
            <h3 className="font-unbounded text-lg font-bold text-white mb-2">Видалити групу?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Ви впевнені, що хочете видалити групу <strong className="text-white">{deleteConfirm.name}</strong>?
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
