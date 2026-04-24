import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Question, Category, QuestionType } from '../../types'
import QuestionFormModal from '../../components/admin/QuestionFormModal'

interface QuestionFormData {
  text: string
  type: QuestionType
  categoryId: string
  isActive: boolean
  answers: { id?: string; text: string; isCorrect: boolean }[]
}

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: 'Одна відповідь',
  MULTI: 'Декілька відповідей',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  SINGLE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MULTI: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export default function QuestionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Question | null>(null)

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories')
      return res.data
    },
  })

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['questions', search, categoryFilter, typeFilter, activeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (categoryFilter) params.categoryId = categoryFilter
      if (typeFilter) params.type = typeFilter
      if (activeFilter === 'ACTIVE') params.isActive = 'true'
      if (activeFilter === 'INACTIVE') params.isActive = 'false'
      const res = await apiClient.get('/questions', { params })
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: QuestionFormData; id?: string }) => {
      if (id) {
        await apiClient.patch(`/questions/${id}`, data)
      } else {
        await apiClient.post('/questions', data)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/questions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setDeleteConfirm(null)
    },
  })

  const handleSave = async (data: QuestionFormData, id?: string) => {
    await saveMutation.mutateAsync({ data, id })
  }

  const truncateText = (text: string, max = 80) =>
    text.length > max ? text.slice(0, max) + '...' : text

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Банк питань</h1>
          <p className="text-slate-400 text-sm">Управління питаннями для тестів</p>
        </div>
        <button
          onClick={() => { setEditQuestion(null); setShowModal(true) }}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати питання
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9 py-2 text-sm"
              placeholder="Пошук питань..."
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="glass-input py-2 text-sm w-auto min-w-40"
        >
          <option value="" className="bg-gray-900">Всі категорії</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as QuestionType | '')}
          className="glass-input py-2 text-sm w-auto min-w-36"
        >
          <option value="" className="bg-gray-900">Всі типи</option>
          <option value="SINGLE" className="bg-gray-900">Одна відповідь</option>
          <option value="MULTI" className="bg-gray-900">Декілька відповідей</option>
        </select>

        <div className="flex gap-1.5">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeFilter === f
                  ? 'bg-purple-accent/30 text-white border-purple-accent/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'ALL' ? 'Всі' : f === 'ACTIVE' ? 'Активні' : 'Архів'}
            </button>
          ))}
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
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Питання</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Тип</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Категорія</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Вага</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody>
                {questions?.map((q) => (
                  <tr key={q.id} className="table-row">
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-white text-sm">{truncateText(q.text)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{q.answers.length} відповідей</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`status-badge border ${TYPE_COLORS[q.type]}`}>
                        {TYPE_LABELS[q.type]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">
                      {q.category?.name || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">
                      {q.category?.pointsWeight ?? '—'} б.
                    </td>
                    <td className="px-5 py-4">
                      <span className={`status-badge border ${
                        q.isActive
                          ? 'status-open'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {q.isActive ? 'Активне' : 'Архів'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditQuestion(q); setShowModal(true) }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(q)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
                {(!questions || questions.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Питань не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <QuestionFormModal
          initial={editQuestion}
          onClose={() => { setShowModal(false); setEditQuestion(null) }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm text-center">
            <h3 className="font-unbounded text-lg font-bold text-white mb-2">Видалити питання?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Ви впевнені? Дію не можна скасувати.
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
