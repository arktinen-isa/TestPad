import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Form, FormSubmission } from '../../types'

export default function FormResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: form } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await apiClient.get(`/forms/${id}`)
      return res.data
    }
  })

  const { data: submissions, isLoading } = useQuery<FormSubmission[]>({
    queryKey: ['form-results', id],
    queryFn: async () => {
      const res = await apiClient.get(`/forms/${id}/results`)
      return res.data
    }
  })

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/forms')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white line-clamp-1">
            {form?.title || 'Результати форми'}
          </h1>
          <p className="text-slate-400 text-sm">Перегляд відповідей користувачів</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !submissions?.length ? (
          <div className="py-20 text-center text-slate-500">
            Відповідей ще не отримано
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Користувач</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата подання</th>
                  {form?.fields?.map(f => (
                    <th key={f.id} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[200px]">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium text-sm">{s.user?.name}</p>
                      <p className="text-slate-500 text-xs">{s.user?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">
                      {new Date(s.submittedAt).toLocaleString('uk-UA')}
                    </td>
                    {form?.fields?.map(f => {
                      const val = s.values?.find(v => v.fieldId === f.id)?.value
                      return (
                        <td key={f.id} className="px-5 py-4 text-white text-sm">
                          {f.type === 'BOOLEAN' 
                            ? (val === 'true' ? <span className="text-green-400">Так</span> : <span className="text-red-400">Ні</span>)
                            : val || '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
