import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Question, Category, QuestionType } from '../../types'
import QuestionFormModal from '../../components/admin/QuestionFormModal'
import ExcelImportModal from '../../components/admin/ExcelImportModal'
import * as XLSX from 'xlsx'

interface QuestionFormData {
  text: string
  type: QuestionType
  categoryId: string
  answers: { id?: string; text: string; isCorrect: boolean }[]
}

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: 'Одна відповідь',
  MULTI: 'Декілька відповідей',
  MATCHING: 'Відповідності',
  ORDERING: 'Послідовність',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  SINGLE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MULTI: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  MATCHING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ORDERING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function QuestionsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false)
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Question | null>(null)

  // Unified Category Management States
  const [newCatName, setNewCatName] = useState('')
  const [newCatWeight, setNewCatWeight] = useState(1)
  const [newCatTimeLimit, setNewCatTimeLimit] = useState<number | ''>('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string, pointsWeight: number, timeLimitSeconds: number | null }) => {
      await apiClient.post('/categories', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setNewCatName('')
      setNewCatWeight(1)
      setNewCatTimeLimit('')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })

  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, typeFilter])

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories')
      return res.data
    },
  })

  const { data: queryData, isLoading } = useQuery<{data: Question[], totalPages: number}>({
    queryKey: ['questions', search, categoryFilter, typeFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '20' }
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter
      if (typeFilter) params.type = typeFilter
      const res = await apiClient.get('/questions', { params })
      return res.data
    },
  })

  const questions = queryData?.data
  const totalPages = queryData?.totalPages || 1

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

  const bulkSaveMutation = useMutation({
    mutationFn: async (questions: any[]) => {
      await apiClient.post('/questions/bulk', questions)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[], data: any }) => {
      await apiClient.patch('/questions/bulk', { ids, data })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setSelectedIds([])
      setShowBulkCategoryModal(false)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await apiClient.delete('/questions/bulk', { data: { ids } })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setSelectedIds([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/questions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      setDeleteConfirm(null)
    },
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === (questions?.length || 0)) {
      setSelectedIds([])
    } else {
      setSelectedIds(questions?.map(q => q.id) || [])
    }
  }

  const downloadTemplate = () => {
    const data = [
      ['Текст питання', 'Назва категорії', 'Тип (SINGLE/MULTI/MATCHING/ORDERING)', 'Варіант 1', 'Вірний (1/0)', 'Варіант 2', 'Вірний (1/0)', 'Варіант 3', 'Вірний (1/0)'],
      ['Приклад питання з однією відповіддю', 'Загальні', 'SINGLE', 'Правильна відповідь', 1, 'Неправильна', 0, 'Ще одна неправильна', 0],
      ['Приклад питання з кількома відповідями', 'Математика', 'MULTI', 'Перша правильна', 1, 'Друга правильна', 1, 'Неправильна', 0]
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'GradeX_Import_Template.xlsx')
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    await createCategoryMutation.mutateAsync({
      name: newCatName,
      pointsWeight: newCatWeight,
      timeLimitSeconds: newCatTimeLimit ? Number(newCatTimeLimit) : null
    })
  }

  const handleBulkCategory = async () => {
    if (!targetCategoryId || selectedIds.length === 0) return
    await bulkUpdateMutation.mutateAsync({ ids: selectedIds, data: { categoryId: targetCategoryId } })
  }

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
          <div className="flex items-center gap-3">
            <p className="text-slate-400 text-sm">Управління питаннями для тестів</p>
            <button
              onClick={downloadTemplate}
              className="text-purple-400 hover:text-purple-300 text-xs font-medium underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Шаблон імпорту
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setEditQuestion(null); setShowModal(true) }}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Додати питання
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-ghost flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Імпорт Excel
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="glass-card p-3 bg-purple-accent/10 border-purple-accent/30 flex items-center justify-between animate-slide-in">
          <p className="text-sm text-white font-medium">Вибрано: {selectedIds.length}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowBulkCategoryModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-all"
            >
              Змінити категорію
            </button>
            <button 
              onClick={() => {
                if (confirm(`Ви впевнені, що хочете видалити ${selectedIds.length} питань?`)) {
                  bulkDeleteMutation.mutate(selectedIds)
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {bulkDeleteMutation.isPending ? 'Видалення...' : 'Видалити обрані'}
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Categories management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-5 space-y-5">
            <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-wider">Категорії</h2>
            
            {/* Create Category button */}
            <button
              onClick={() => setShowCategoryModal(true)}
              className="w-full btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Створити категорію
            </button>

            <div className="h-px bg-white/5" />

            {/* Category Listing / Quick Filters */}
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              <button
                onClick={() => setCategoryFilter('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                  categoryFilter === ''
                    ? 'bg-purple-accent/20 border-purple-accent/30 text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                }`}
              >
                <span>Всі категорії</span>
              </button>

              {categories?.map((c) => (
                <div key={c.id} className="group relative flex items-center">
                  <button
                    onClick={() => setCategoryFilter(c.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                      categoryFilter === c.id
                        ? 'bg-purple-accent/20 border-purple-accent/30 text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    <span className="truncate pr-6">{c.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-400 font-bold flex-shrink-0 group-hover:opacity-0 transition-opacity flex items-center gap-1.5">
                      <span>{c.pointsWeight} б.</span>
                      {c.timeLimitSeconds ? <span>({c.timeLimitSeconds}с)</span> : null}
                      <span className="bg-purple-accent/20 text-purple-300 px-1 py-0.5 rounded text-[9px] font-black">{c.questionCount ?? 0} ?</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Ви впевнені, що хочете видалити категорію "${c.name}"?`)) {
                        deleteCategoryMutation.mutate(c.id)
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Видалити категорію"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Questions Grid/List */}
        <div className="lg:col-span-3 space-y-6">
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
                  placeholder="Пошук питань за текстом..."
                />
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as QuestionType | '')}
              className="glass-input py-2 text-sm w-auto min-w-36"
            >
              <option value="" className="bg-gray-900">Всі типи питань</option>
              <option value="SINGLE" className="bg-gray-900">Одна відповідь</option>
              <option value="MULTI" className="bg-gray-900">Декілька відповідей</option>
              <option value="MATCHING" className="bg-gray-900">Відповідності</option>
              <option value="ORDERING" className="bg-gray-900">Послідовність</option>
            </select>
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
                      <th className="px-5 py-4 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-white/20 bg-white/5 text-purple-accent"
                          checked={selectedIds.length > 0 && selectedIds.length === questions?.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Питання</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Тип</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Категорія</th>
                      <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions?.map((q) => (
                      <tr key={q.id} className={`table-row ${selectedIds.includes(q.id) ? 'bg-purple-accent/5' : ''}`}>
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 bg-white/5 text-purple-accent"
                            checked={selectedIds.includes(q.id)}
                            onChange={() => toggleSelect(q.id)}
                          />
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <p className="text-white text-sm">{truncateText(q.text)}</p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {q.type === 'MATCHING' 
                              ? `${(q.matchingPairs as any)?.length || 0} пар` 
                              : q.type === 'ORDERING' 
                              ? `${(q.orderingItems as any)?.length || 0} кроків` 
                              : `${q.answers?.length || 0} відповідей`}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`status-badge border ${TYPE_COLORS[q.type]}`}>
                            {TYPE_LABELS[q.type]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-sm">
                          {q.category?.name || '—'}
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
                    {questions?.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500 text-sm">
                          У цій категорії поки що немає питань. Створіть нове за допомогою кнопки вище.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Попередня
              </button>
              <span className="text-slate-400 text-sm font-medium px-4">
                Сторінка {page} з {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Наступна
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <QuestionFormModal
          initial={editQuestion}
          onClose={() => { setShowModal(false); setEditQuestion(null) }}
          onSave={handleSave}
        />
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 space-y-6 relative animate-zoom-in">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="font-unbounded text-base font-bold text-white mb-1">Створити категорію</h3>
              <p className="text-slate-400 text-xs">Додайте нову категорію питань для тестів</p>
            </div>
            <form onSubmit={(e) => {
              handleCreateCategory(e);
              setShowCategoryModal(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Назва категорії</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Наприклад: Основи React..."
                  className="glass-input text-sm py-2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Вага категорії (бали за питання)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newCatWeight}
                  onChange={(e) => setNewCatWeight(parseInt(e.target.value))}
                  placeholder="Наприклад: 5"
                  className="glass-input text-sm py-2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Таймер на одне питання (сек, необов'язково)</label>
                <input
                  type="number"
                  min={1}
                  value={newCatTimeLimit}
                  onChange={(e) => setNewCatTimeLimit(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Наприклад: 60"
                  className="glass-input text-sm py-2.5"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 btn-ghost text-xs py-2.5"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="flex-1 btn-secondary text-xs py-2.5 disabled:opacity-50"
                >
                  {createCategoryMutation.isPending ? 'Створення...' : 'Створити'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <ExcelImportModal
          categories={categories || []}
          onClose={() => setShowImportModal(false)}
          onImport={async (q) => { await bulkSaveMutation.mutateAsync(q) }}
        />
      )}

      {showBulkCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <h2 className="font-unbounded text-lg font-bold text-white mb-6 text-center">Змінити категорію ({selectedIds.length})</h2>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 mb-6">
              {categories?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTargetCategoryId(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    targetCategoryId === c.id
                      ? 'bg-purple-accent/30 text-white border-purple-accent/60 ring-1 ring-purple-accent/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-slate-500 text-xs py-2 w-full text-center">Категорій не знайдено</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkCategoryModal(false)} className="flex-1 btn-ghost">Скасувати</button>
              <button
                onClick={handleBulkCategory}
                disabled={bulkUpdateMutation.isPending || !targetCategoryId}
                className="flex-1 btn-secondary"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
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
