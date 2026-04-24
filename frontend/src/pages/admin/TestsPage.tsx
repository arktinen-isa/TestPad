import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Test, TestStatus } from '../../types'
import TestFormModal from '../../components/admin/TestFormModal'

interface TestFormData {
  title: string
  subject: string
  groupIds: string[]
  openFrom: string
  openUntil: string
  timeLimitMin: number
  maxAttempts: number
  questionsCount: number
  samplingMode: string
  categoryQuotas: { categoryId: string; quota: number }[]
  scoringMode: string
  multiScoringMode: string
  passThreshold: number | ''
  showResultMode: string
  shuffleQuestions: boolean
  status: TestStatus
}

const STATUS_LABELS: Record<TestStatus, string> = {
  DRAFT: 'Чернетка',
  OPEN: 'Відкрито',
  CLOSED: 'Закрито',
}

const STATUS_CLASSES: Record<TestStatus, string> = {
  DRAFT: 'status-badge status-draft',
  OPEN: 'status-badge status-open',
  CLOSED: 'status-badge status-closed',
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TestsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editTest, setEditTest] = useState<Test | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Test | null>(null)
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'ALL'>('ALL')

  const { data: tests, isLoading } = useQuery<Test[]>({
    queryKey: ['tests', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter !== 'ALL') params.status = statusFilter
      const res = await apiClient.get('/tests', { params })
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: TestFormData; id?: string }) => {
      if (id) {
        await apiClient.patch(`/tests/${id}`, data)
      } else {
        await apiClient.post('/tests', data)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/tests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      setDeleteConfirm(null)
    },
  })

  const handleSave = async (data: TestFormData, id?: string) => {
    await saveMutation.mutateAsync({ data, id })
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Тести</h1>
          <p className="text-slate-400 text-sm">Управління тестовими завданнями</p>
        </div>
        <button
          onClick={() => { setEditTest(null); setShowModal(true) }}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Створити тест
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['ALL', 'DRAFT', 'OPEN', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              statusFilter === s
                ? 'bg-purple-accent/30 text-white border-purple-accent/50'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Всі' : STATUS_LABELS[s]}
          </button>
        ))}
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
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Предмет</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Відкрито</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Закрито</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Питань</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody>
                {tests?.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{t.title}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{t.subject || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={STATUS_CLASSES[t.status]}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">{formatDateTime(t.openFrom)}</td>
                    <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">{formatDateTime(t.openUntil)}</td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{t.questionsCount}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/tests/${t.id}/results`)}
                          className="p-2 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
                          title="Результати"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditTest(t); setShowModal(true) }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Редагувати"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(t)}
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
                {(!tests || tests.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      Тестів не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TestFormModal
          initial={editTest}
          onClose={() => { setShowModal(false); setEditTest(null) }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm text-center">
            <h3 className="font-unbounded text-lg font-bold text-white mb-2">Видалити тест?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Видалити тест <strong className="text-white">"{deleteConfirm.title}"</strong>?
              Всі результати також будуть видалені.
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
