
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Form } from '../../types'

export default function FormsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  
  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: ['forms'],
    queryFn: async () => {
      const res = await apiClient.get('/api/forms')
      return res.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/forms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] })
  })

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Чернетка',
    OPEN: 'Відкрито',
    CLOSED: 'Закрито'
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
    CLOSED: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Форми та опитування</h1>
          <p className="text-slate-400 text-sm">Збір інформації та анкетування користувачів</p>
        </div>
        <button 
          onClick={() => navigate('/admin/forms/new')}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Створити форму
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : forms?.map(form => (
          <div key={form.id} className="glass-card p-5 group hover:border-purple-accent/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <span className={`status-badge border ${STATUS_COLORS[form.status]}`}>
                {STATUS_LABELS[form.status]}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => navigate(`/admin/forms/${form.id}/edit`)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Видалити форму?')) deleteMutation.mutate(form.id)
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <h3 className="font-unbounded text-base font-bold text-white mb-2 line-clamp-1">{form.title}</h3>
            <p className="text-slate-400 text-xs line-clamp-2 mb-4 h-8">{form.description || 'Опис відсутній'}</p>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black">Відповідей</span>
                <span className="text-lg font-unbounded font-bold text-white">{(form as any)._count?.submissions || 0}</span>
              </div>
              <button 
                onClick={() => navigate(`/admin/forms/${form.id}/results`)}
                className="px-4 py-2 rounded-xl bg-purple-accent/10 text-purple-400 text-xs font-bold hover:bg-purple-accent/20 transition-all"
              >
                РЕЗУЛЬТАТИ
              </button>
            </div>
          </div>
        ))}
        {!isLoading && forms?.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card border-dashed">
            <p className="text-slate-500">Ви ще не створили жодної форми</p>
          </div>
        )}
      </div>
    </div>
  )
}
