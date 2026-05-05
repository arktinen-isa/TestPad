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
  status: TestStatus
}

const STATUS_LABELS: Record<TestStatus, string> = {
  DRAFT: 'Чернетка',
  OPEN: 'Відкрито',
  CLOSED: 'Закрито',
}

const STATUS_COLORS: Record<TestStatus, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  CLOSED: 'bg-red-500/20 text-red-400 border-red-500/30',
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
      return res.data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: TestFormData; id?: string }) => {
      const payload = {
        ...data,
        openFrom: data.openFrom ? new Date(data.openFrom).toISOString() : (data.openFrom === null || data.openFrom === '') ? null : undefined,
        openUntil: data.openUntil ? new Date(data.openUntil).toISOString() : (data.openUntil === null || data.openUntil === '') ? null : undefined,
        passThreshold: data.passThreshold !== '' ? data.passThreshold : undefined,
      }
      if (id) {
        await apiClient.patch(`/tests/${id}`, payload)
      } else {
        await apiClient.post('/tests', payload)
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
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Помилка при видаленні тесту'
      alert(msg) // Simple alert for now as per minimal requirements
    }
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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : tests?.map((t) => (
          <div key={t.id} className="glass-card p-5 group hover:border-purple-accent/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <span className={`status-badge border ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditTest(t); setShowModal(true) }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Редагувати"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Видалити"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-purple-accent/80 block mb-0.5">
                  {t.subject || 'Дисципліна'}
                </span>
                <h3 className="font-unbounded text-base font-bold text-white mb-2 line-clamp-1">{t.title}</h3>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 mb-5">
                <div className="flex justify-between">
                  <span>Кількість питань:</span>
                  <span className="text-white font-medium">{t.questionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Режим вибірки:</span>
                  <span className="text-white font-medium">{t.samplingMode === 'BY_CATEGORY' ? 'За категоріями' : 'З усього банку'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Дедлайн:</span>
                  <span className="text-white font-medium">{formatDateTime(t.openUntil)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black">Режим таймера</span>
                <span className="text-xs font-bold text-white uppercase">{t.timerMode === 'PER_QUESTION' ? 'По-питанням' : 'Глобальний'}</span>
              </div>
              <button 
                onClick={() => navigate(`/admin/tests/${t.id}/results`)}
                className="px-4 py-2 rounded-xl bg-purple-accent/10 text-purple-400 text-xs font-bold hover:bg-purple-accent/20 transition-all"
              >
                РЕЗУЛЬТАТИ
              </button>
            </div>
          </div>
        ))}
        {!isLoading && tests?.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card border-dashed">
            <p className="text-slate-500">Тестів не знайдено</p>
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
