import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Form } from '../../types'

export default function StudentFormsPage() {
  const navigate = useNavigate()

  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: ['student-forms'],
    queryFn: async () => {
      const res = await apiClient.get('/forms')
      return res.data
    }
  })

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Опитування та анкети</h1>
        <p className="text-slate-400 text-sm">Будь ласка, знайдіть кілька хвилин, щоб поділитися своєю думкою</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : forms?.map(form => (
          <div key={form.id} className="glass-card p-6 flex flex-col justify-between hover:border-purple-accent/30 transition-all">
            <div>
              <h3 className="font-unbounded text-base font-bold text-white mb-2">{form.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{form.description || 'Опис відсутній'}</p>
            </div>
            <button 
              onClick={() => navigate(`/student/forms/${form.id}`)}
              className="w-full btn-secondary py-3 text-center"
            >
              Пройти опитування
            </button>
          </div>
        ))}
        {!isLoading && forms?.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card border-dashed">
            <p className="text-slate-500">Наразі немає активних опитувань</p>
          </div>
        )}
      </div>
    </div>
  )
}
