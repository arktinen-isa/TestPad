import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Form, FormFieldType, TestStatus, Group } from '../../types'
import * as XLSX from 'xlsx'

interface FieldInput {
  label: string
  type: FormFieldType
  required: boolean
  correctAnswer?: string
}

export default function FormEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TestStatus>('DRAFT')
  const [groupId, setGroupId] = useState('')
  const [openFrom, setOpenFrom] = useState('')
  const [openUntil, setOpenUntil] = useState('')
  const [fields, setFields] = useState<FieldInput[]>([
    { label: '', type: 'TEXT', required: true, correctAnswer: '' }
  ])

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })

  const { isLoading } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await apiClient.get(`/forms/${id}`)
      const form = res.data
      setTitle(form.title)
      setDescription(form.description || '')
      setStatus(form.status)
      setGroupId(form.groupId || '')
      setOpenFrom(form.openFrom ? form.openFrom.substring(0, 16) : '')
      setOpenUntil(form.openUntil ? form.openUntil.substring(0, 16) : '')
      setFields(form.fields || [])
      return form
    },
    enabled: isEdit
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { 
        title, 
        description, 
        status, 
        groupId: groupId || null, 
        openFrom: openFrom || null, 
        openUntil: openUntil || null, 
        fields 
      }
      if (isEdit) {
        await apiClient.patch(`/forms/${id}`, data)
      } else {
        await apiClient.post('/forms', data)
      }
    },
    onSuccess: () => navigate('/admin/forms')
  })

  const addField = () => {
    setFields([...fields, { label: '', type: 'TEXT', required: true, correctAnswer: '' }])
  }

  const removeField = (idx: number) => {
    if (fields.length <= 1) return
    setFields(fields.filter((_, i) => i !== idx))
  }

  const updateField = (idx: number, field: keyof FieldInput, value: any) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, [field]: value } : f))
  }

  const downloadTemplate = () => {
    const data = [
      ['Запитання (Label)', 'Тип поля (TEXT/BOOLEAN/INTEGER/FLOAT)', 'Обов\'язкове (1/0)', 'Правильна відповідь (необов\'язково)'],
      ['Ваше ПІБ', 'TEXT', 1, ''],
      ['Чи сподобався вам курс?', 'BOOLEAN', 1, 'так'],
      ['Ваш вік', 'INTEGER', 0, '20'],
      ['Середній бал', 'FLOAT', 0, '4.5'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'FormFieldsTemplate')
    XLSX.writeFile(wb, 'GradeX_Form_Import_Template.xlsx')
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
        
        // Skip header row
        const rows = data.slice(1)
        const importedFields: FieldInput[] = rows
          .filter((row) => row[0] && row[0].toString().trim() !== '')
          .map((row) => {
            let type: FormFieldType = 'TEXT'
            const typeStr = row[1]?.toString().toUpperCase().trim()
            if (['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT'].includes(typeStr)) {
              type = typeStr as FormFieldType
            }
            return {
              label: row[0].toString().trim(),
              type,
              required: row[2] == 1 || row[2] === true || row[2]?.toString().toLowerCase() === 'true' || row[2]?.toString() === '1',
              correctAnswer: row[3]?.toString().trim() || '',
            }
          })
        
        if (importedFields.length > 0) {
          setFields((prev) => [...prev.filter((f) => f.label !== ''), ...importedFields])
        }
      } catch (err) {
        console.error('Failed to import fields:', err)
        alert('Помилка імпорту файлу. Будь ласка, перевірте формат шаблону.')
      }
    }
    reader.readAsBinaryString(file)
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Статус</label>
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
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">👥 Призначити для групи</label>
                <select 
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="glass-input"
                >
                  <option value="" className="bg-slate-900">Всі групи (Спільна)</option>
                  {groups?.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900">{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">📅 Доступно з (необов'язково)</label>
                <input 
                  type="datetime-local"
                  value={openFrom}
                  onChange={(e) => setOpenFrom(e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">📅 Доступно по (необов'язково)</label>
                <input 
                  type="datetime-local"
                  value={openUntil}
                  onChange={(e) => setOpenUntil(e.target.value)}
                  className="glass-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 mb-2">
              <div>
                <h2 className="font-unbounded text-sm font-bold text-white">Поля форми</h2>
                <p className="text-[10px] text-slate-400">Налаштуйте поля вводу вручну або імпортуйте з Excel</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button" onClick={downloadTemplate}
                  className="btn-ghost text-[10px] py-1.5 px-3 flex items-center gap-1 hover:text-purple-400"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Шаблон Excel
                </button>
                <label className="btn-ghost text-[10px] py-1.5 px-3 flex items-center gap-1 cursor-pointer hover:text-purple-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Імпортувати Excel
                  <input 
                    type="file" accept=".xlsx, .xls"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                <button 
                  type="button" onClick={addField}
                  className="btn-secondary text-[10px] py-1.5 px-3 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Додати поле
                </button>
              </div>
            </div>

            {fields.map((field, idx) => (
              <div key={idx} className="glass-card p-5 space-y-4 animate-slide-in relative group">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-xs font-bold">Поле #{idx + 1}</span>
                  <button 
                    type="button" onClick={() => removeField(idx)}
                    disabled={fields.length <= 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Запитання</label>
                    <input 
                      type="text" required value={field.label}
                      onChange={(e) => updateField(idx, 'label', e.target.value)}
                      className="glass-input text-sm py-2" placeholder="Запитання..."
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Тип поля</label>
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
                  <div className="md:col-span-3 flex items-center md:pt-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" checked={field.required}
                        onChange={(e) => updateField(idx, 'required', e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-purple-accent"
                      />
                      <span className="text-xs text-slate-300">Обов'язкове поле</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Правильна еталонна відповідь (необов'язково)</label>
                  <input 
                    type="text" value={field.correctAnswer || ''}
                    onChange={(e) => updateField(idx, 'correctAnswer', e.target.value)}
                    className="glass-input text-sm py-2" placeholder="Наприклад: так, 42, 3.14..."
                  />
                </div>
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
