import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Category } from '../../types'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [pointsWeight, setPointsWeight] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories')
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        await apiClient.patch(`/categories/${editingCategory.id}`, { name, pointsWeight })
      } else {
        await apiClient.post('/categories', { name, pointsWeight })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      closeModal()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Помилка збереження')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat)
      setName(cat.name)
      setPointsWeight(cat.pointsWeight)
    } else {
      setEditingCategory(null)
      setName('')
      setPointsWeight(1)
    }
    setIsModalOpen(true)
    setError(null)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setName('')
    setPointsWeight(1)
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Категорії питань</h1>
          <p className="text-slate-400 text-sm">Керування категоріями та вагою балів</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати категорію
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Назва</th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Вага (балів)</th>
              <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-1/2" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-white/10 rounded w-1/4" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-4 bg-white/10 rounded w-1/4 ml-auto" /></td>
                </tr>
              ))
            ) : categories?.map((cat) => (
              <tr key={cat.id} className="table-row">
                <td className="px-5 py-4 text-white font-medium">{cat.name}</td>
                <td className="px-5 py-4 text-slate-300">{cat.pointsWeight}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openModal(cat)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { if(confirm('Видалити категорію?')) deleteMutation.mutate(cat.id) }}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md">
            <h2 className="font-unbounded text-lg font-bold text-white mb-6">
              {editingCategory ? 'Редагувати категорію' : 'Додати категорію'}
            </h2>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Назва</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input" placeholder="Програмування"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Вага балів за одне питання</label>
                <input
                  type="number" required min="0.1" step="0.1" value={pointsWeight}
                  onChange={(e) => setPointsWeight(Number(e.target.value))}
                  className="glass-input"
                />
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 btn-ghost">Скасувати</button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 btn-secondary">
                  {saveMutation.isPending ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
