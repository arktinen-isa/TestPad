import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Form, FormFieldType, TestStatus } from '../../types'

interface FieldInput {
  label: string
  type: FormFieldType
  required: boolean
}

export default function FormEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TestStatus>('DRAFT')
  const [fields, setFields] = useState<FieldInput[]>([
    { label: '', type: 'TEXT', required: true }
  ])

  const { isLoading } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/forms/${id}`)
      const form = res.data
      setTitle(form.title)
      setDescription(form.description || '')
      setStatus(form.status)
      setFields(form.fields || [])
      return form
    },
    enabled: isEdit
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { title, description, status, fields }
      if (isEdit) {
        await apiClient.patch(`/api/forms/${id}`, data)
      } else {
        await apiClient.post('/api/forms', data)
      }
    },
    onSuccess: () => navigate('/admin/forms')
  })

  const addField = () => {
    setFields([...fields, { label: '', type: 'TEXT', required: true }])
  }

  const removeField = (idx: number) => {
    if (fields.length <= 1) return
    setFields(fields.filter((_, i) => i !== idx))
  }

  const updateField = (idx: number, field: keyof FieldInput, value: any) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, [field]: value } : f))
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
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
          <h1 className="font-unbounded text-2xl font-bold text-white">
            {isEdit ? 'Редагувати форму' : 'Створити форму'}
          </h1>
          <p className="text-slate-400 text-sm">Конструктор опитування та полів вводу</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Назва форми</label>
              <input 
                type="text" required value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input" placeholder="Анкета задоволеності навчанням..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Опис форми</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="glass-input resize-none" rows={3}
                placeholder="Будь ласка, заповніть цю анкету для покращення якості дисципліни..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Статус</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as TestStatus)}
                className="glass-input"
              >
                <option value="DRAFT" className="bg-slate-900">Чернетка</option>
                <option value="OPEN" className="bg-slate-900">Відкрито</option>
                <option value="CLOSED" className="bg-slate-900">Закрито</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-unbounded text-sm font-bold text-white">Поля форми</h2>
              <button 
                type="button" onClick={addField}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Додати поле
              </button>
            </div>

            {fields.map((field, idx) => (
              <div key={idx} className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center gap-4 animate-slide-in">
                <span className="text-slate-500 font-mono text-xs w-6">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" required value={field.label}
                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                    className="glass-input text-sm py-2" placeholder="Запитання..."
                  />
                </div>
                <div className="w-full md:w-48">
                  <select 
                    value={field.type}
                    onChange={(e) => updateField(idx, 'type', e.target.value as FormFieldType)}
                    className="glass-input text-sm py-2"
                  >
                    <option value="TEXT" className="bg-slate-900">Текст</option>
                    <option value="BOOLEAN" className="bg-slate-900">Так / Ні (Логічне)</option>
                    <option value="INTEGER" className="bg-slate-900">Ціле число</option>
                    <option value="FLOAT" className="bg-slate-900">Дійсне число</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" checked={field.required}
                    onChange={(e) => updateField(idx, 'required', e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-purple-accent"
                  />
                  <span className="text-xs text-slate-400">Обов'язкове</span>
                </label>
                <button 
                  type="button" onClick={() => removeField(idx)}
                  disabled={fields.length <= 1}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              type="button" onClick={() => navigate('/admin/forms')}
              className="flex-1 btn-ghost"
            >
              Скасувати
            </button>
            <button 
              type="submit" disabled={saveMutation.isPending}
              className="flex-1 btn-secondary disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Збереження...' : 'Зберегти форму'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
