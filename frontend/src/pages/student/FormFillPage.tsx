import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Form } from '../../types'

export default function FormFillPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)

  const { data: form, isLoading } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/forms/${id}`)
      return res.data
    }
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/forms/${id}/submit`, { values })
    },
    onSuccess: () => navigate('/student/forms'),
    onError: (err: any) => setError(err.response?.data?.error || 'Помилка надсилання')
  })

  const handleValueChange = (fieldId: string, val: any) => {
    setValues({ ...values, [fieldId]: val })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    submitMutation.mutate()
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/student/forms')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white line-clamp-1">
            {form?.title || 'Опитування'}
          </h1>
          <p className="text-slate-400 text-sm">Збір інформації та анкетування</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {form?.description && (
            <div className="glass-card p-5">
              <p className="text-slate-300 text-sm">{form.description}</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {form?.fields?.map(field => (
              <div key={field.id} className="glass-card p-6 space-y-3">
                <label className="block text-sm font-semibold text-white">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>

                {field.type === 'TEXT' && (
                  <input 
                    type="text" required={field.required}
                    value={values[field.id] || ''}
                    onChange={(e) => handleValueChange(field.id, e.target.value)}
                    className="glass-input" placeholder="Ваша відповідь..."
                  />
                )}

                {field.type === 'INTEGER' && (
                  <input 
                    type="number" step="1" required={field.required}
                    value={values[field.id] || ''}
                    onChange={(e) => handleValueChange(field.id, e.target.value)}
                    className="glass-input" placeholder="Ціле число..."
                  />
                )}

                {field.type === 'FLOAT' && (
                  <input 
                    type="number" step="any" required={field.required}
                    value={values[field.id] || ''}
                    onChange={(e) => handleValueChange(field.id, e.target.value)}
                    className="glass-input" placeholder="Дійсне число..."
                  />
                )}

                {field.type === 'BOOLEAN' && (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                      <input 
                        type="radio" name={field.id} required={field.required}
                        checked={values[field.id] === true}
                        onChange={() => handleValueChange(field.id, true)}
                        className="text-purple-accent focus:ring-0"
                      />
                      <span className="text-sm text-slate-300">Так</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                      <input 
                        type="radio" name={field.id} required={field.required}
                        checked={values[field.id] === false}
                        onChange={() => handleValueChange(field.id, false)}
                        className="text-purple-accent focus:ring-0"
                      />
                      <span className="text-sm text-slate-300">Ні</span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              type="button" onClick={() => navigate('/student/forms')}
              className="flex-1 btn-ghost"
            >
              Скасувати
            </button>
            <button 
              type="submit" disabled={submitMutation.isPending}
              className="flex-1 btn-secondary disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Надсилання...' : 'Надіслати відповіді'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
