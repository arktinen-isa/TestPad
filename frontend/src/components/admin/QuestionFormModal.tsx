import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { Question, Category, QuestionType } from '../../types'
import QuestionText from '../QuestionText'

interface AnswerInput {
  id?: string
  text: string
  isCorrect: boolean
}

interface QuestionFormData {
  text: string
  type: QuestionType
  categoryId: string
  imageUrl?: string
  answers: AnswerInput[]
}

interface QuestionFormModalProps {
  initial?: Question | null
  onClose: () => void
  onSave: (data: QuestionFormData, id?: string) => Promise<void>
}

export default function QuestionFormModal({ initial, onClose, onSave }: QuestionFormModalProps) {
  const [form, setForm] = useState<QuestionFormData>({
    text: initial?.text || '',
    type: initial?.type || 'SINGLE',
    categoryId: initial?.categoryId || '',
    imageUrl: initial?.imageUrl || '',
    answers: initial?.answers?.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect ?? false })) || [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedLang, setSelectedLang] = useState('javascript')

  const LANGUAGES = [
    { id: 'javascript', name: 'JS' },
    { id: 'python', name: 'Python' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'sql', name: 'SQL' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'bash', name: 'Bash' },
    { id: 'php', name: 'PHP' },
    { id: 'csharp', name: 'C#' },
  ]

  const insertCodeBlock = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = form.text
    const selection = text.substring(start, end)
    
    const before = text.substring(0, start)
    const after = text.substring(end)
    
    // Ensure block starts on new line if needed
    const prefix = (before.length > 0 && !before.endsWith('\n')) ? '\n' : ''
    const newText = `${before}${prefix}\`\`\`${selectedLang}\n${selection || '...код тут...'}\n\`\`\`\n${after}`
    
    setForm({ ...form, text: newText })
    
    setTimeout(() => {
      textarea.focus()
      const startOffset = prefix.length + 4 + selectedLang.length // \n```lang\n
      textarea.setSelectionRange(
        start + startOffset,
        start + startOffset + (selection ? selection.length : 9)
      )
    }, 0)
  }

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories')
      return res.data
    },
  })

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((f) => ({ ...f, imageUrl: res.data.imageUrl }))
    } catch {
      setError('Помилка завантаження зображення')
    } finally {
      setUploading(false)
    }
  }

  const addAnswer = () => {
    if (form.answers.length >= 8) return
    setForm({ ...form, answers: [...form.answers, { text: '', isCorrect: false }] })
  }

  const removeAnswer = (idx: number) => {
    if (form.answers.length <= 2) return
    setForm({ ...form, answers: form.answers.filter((_, i) => i !== idx) })
  }

  const updateAnswer = (idx: number, field: keyof AnswerInput, value: string | boolean) => {
    const updated = form.answers.map((a, i) => {
      if (i !== idx) {
        if (field === 'isCorrect' && value === true && form.type === 'SINGLE') {
          return { ...a, isCorrect: false }
        }
        return a
      }
      return { ...a, [field]: value }
    })
    setForm({ ...form, answers: updated })
  }

  const handleTypeChange = (type: QuestionType) => {
    let answers = form.answers
    if (type === 'SINGLE') {
      const firstCorrectIdx = answers.findIndex((a) => a.isCorrect)
      answers = answers.map((a, i) => ({ ...a, isCorrect: i === firstCorrectIdx }))
    }
    setForm({ ...form, type, answers })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoryId) { setError('Оберіть категорію'); return }
    if (!form.answers.some((a) => a.isCorrect)) { setError('Позначте хоча б одну правильну відповідь'); return }
    if (form.answers.some((a) => !a.text.trim())) { setError('Заповніть текст усіх відповідей'); return }

    setLoading(true)
    setError(null)
    try {
      await onSave({ ...form, imageUrl: form.imageUrl || undefined }, initial?.id)
      onClose()
    } catch (err: unknown) {
      setError(
        getApiError(err, 'Помилка збереження')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-lg font-bold text-white">
            {initial ? 'Редагувати питання' : 'Додати питання'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question text */}
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Текст питання
                <span className="text-slate-500 font-normal ml-2 text-xs">
                  (підтримує Markdown)
                </span>
              </label>
              
              <div className="flex items-center gap-2">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 outline-none hover:bg-white/10 transition-colors"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={insertCodeBlock}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-accent/10 border border-purple-accent/20 text-purple-400 hover:bg-purple-accent/20 transition-all text-[10px] font-bold"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  ВСТАВИТИ КОД
                </button>
              </div>
            </div>
            <textarea
              required
              ref={textareaRef}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="glass-input resize-none font-mono text-sm"
              rows={4}
              placeholder="Введіть текст питання або код..."
            />

          {/* Preview */}
          {form.text && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">
                Попередній перегляд
              </label>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <QuestionText text={form.text} className="text-sm text-slate-300" />
              </div>
            </div>
          )}

          {/* Type and Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Тип питання</label>
              <select
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="glass-input"
              >
                <option value="SINGLE" className="bg-gray-900">Одна відповідь</option>
                <option value="MULTI" className="bg-gray-900">Декілька відповідей</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Категорія</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                {categories?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, categoryId: c.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      form.categoryId === c.id
                        ? 'bg-purple-accent/30 text-white border-purple-accent/60 ring-1 ring-purple-accent/30'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {(!categories || categories.length === 0) && (
                  <p className="text-slate-500 text-xs py-2">Категорій не знайдено</p>
                )}
              </div>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Зображення
              <span className="text-slate-500 font-normal ml-2">(необов'язково, до 5 МБ)</span>
            </label>
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImageUpload(f)
                e.target.value = ''
              }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Завантаження...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Завантажити зображення
                  </>
                )}
              </button>
              {form.imageUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={form.imageUrl}
                    alt="Прев'ю"
                    className="h-10 w-10 object-cover rounded-lg border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Видалити
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Answers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">
                Варіанти відповідей
                <span className="text-slate-500 ml-2">
                  ({form.type === 'SINGLE' ? 'Одна правильна' : 'Декілька правильних'})
                </span>
              </label>
              <button
                type="button"
                onClick={addAnswer}
                disabled={form.answers.length >= 8}
                className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Додати
              </button>
            </div>

            <div className="space-y-2.5">
              {form.answers.map((answer, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (form.type === 'SINGLE') {
                        setForm({ ...form, answers: form.answers.map((a, i) => ({ ...a, isCorrect: i === idx })) })
                      } else {
                        updateAnswer(idx, 'isCorrect', !answer.isCorrect)
                      }
                    }}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      answer.isCorrect
                        ? 'border-green-cta bg-green-cta/20'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    title={answer.isCorrect ? 'Правильна відповідь' : 'Позначити як правильну'}
                  >
                    {answer.isCorrect && (
                      <svg className="w-3 h-3 text-green-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="text"
                    required
                    value={answer.text}
                    onChange={(e) => updateAnswer(idx, 'text', e.target.value)}
                    className={`glass-input flex-1 text-sm py-2.5 ${
                      answer.isCorrect ? 'border-green-cta/30 focus:border-green-cta/60' : ''
                    }`}
                    placeholder={`Варіант ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeAnswer(idx)}
                    disabled={form.answers.length <= 2}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost">Скасувати</button>
            <button type="submit" disabled={loading || uploading} className="flex-1 btn-secondary disabled:opacity-50">
              {loading ? 'Збереження...' : 'Зберегти питання'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
