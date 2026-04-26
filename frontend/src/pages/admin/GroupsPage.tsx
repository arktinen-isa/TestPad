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
  const [unassignedSearch, setUnassignedSearch] = useState('')

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
      const res = await apiClient.get('/users', { params: { unassigned: 'true', limit: 100 } })
      return res.data.data
    },
  })

  const filteredUnassigned = unassignedStudents?.filter(s => 
    s.name.toLowerCase().includes(unassignedSearch.toLowerCase()) || 
    s.email.toLowerCase().includes(unassignedSearch.toLowerCase())
  ) || []

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
      qc.invalidateQueries({ queryKey: ['groups'] })
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
      <div className="modal-card max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-accent/20 flex items-center justify-center text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-unbounded text-lg font-bold text-white">Управління групою</h2>
              <p className="text-slate-400 text-xs">Група: <span className="text-purple-400 font-semibold">{group.name}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowImportModal(true)}
              className="text-xs font-bold text-white bg-purple-accent px-4 py-2 rounded-xl hover:bg-purple-600 transition-all flex items-center gap-2 shadow-lg shadow-purple-accent/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Імпорт з Excel
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Current students */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Студенти в групі ({students?.length || 0})
                </h3>
              </div>
              
              <form onSubmit={handleAddByEmail} className="mb-4">
                <div className="relative group">
                  <input
                    type="email" required value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="glass-input pl-10 py-2.5 text-sm h-10"
                    placeholder="Додати за email..."
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <button type="submit" disabled={addLoading} className="absolute right-1 top-1 h-8 px-3 rounded-lg bg-purple-accent text-white text-[10px] font-bold hover:bg-purple-600 transition-all disabled:opacity-50">
                    {addLoading ? '...' : 'ДОДАТИ'}
                  </button>
                </div>
                {addError && <p className="text-red-400 text-[10px] mt-1">{addError}</p>}
              </form>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar bg-white/[0.02] rounded-2xl p-2 border border-white/5">
                {isLoading ? (
                  <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : students && students.length > 0 ? (
                  students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded-lg bg-purple-accent/10 border border-purple-accent/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-purple-300">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-white text-[13px] font-medium truncate leading-tight">{s.name}</p>
                          <p className="text-slate-500 text-[10px] truncate">{s.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeMutation.mutate(s.id)} 
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Вилучити з групи"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-500 text-xs">У цій групі ще немає студентів</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Unassigned students */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                Вільні студенти ({filteredUnassigned.length})
              </h3>

              <div className="mb-4 relative">
                <input
                  type="text"
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  className="glass-input pl-10 py-2.5 text-sm h-10"
                  placeholder="Пошук у вільних..."
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar bg-white/[0.02] rounded-2xl p-2 border border-white/5">
                {isUnassignedLoading ? (
                  <div className="py-10 text-center"><div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                ) : filteredUnassigned.length > 0 ? (
                  filteredUnassigned.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 group transition-all">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-yellow-500">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-white text-[13px] font-medium truncate leading-tight">{s.name}</p>
                          <p className="text-slate-500 text-[10px] truncate">{s.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addMutation.mutate(s.id)}
                        disabled={addMutation.isPending}
                        className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                        title="Додати до групи"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-500 text-xs">Не знайдено вільних студентів</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/50 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="btn-ghost px-8 h-10 text-sm font-semibold">Закрити</button>
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
                        {g.studentCount ?? 0} студ.
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
