import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { Test, TestStatus, Category, Group } from '../../types'

interface CategoryQuotaInput {
  categoryId: string
  quota: number
}

interface TestFormData {
  title: string
  subject: string
  groupIds: string[]
  openFrom: string
  openUntil: string
  timeLimitMin: number
  maxAttempts: number
  questionsCount: number
  samplingMode: string
  categoryQuotas: CategoryQuotaInput[]
  scoringMode: string
  multiScoringMode: string
  passThreshold: number | ''
  showResultMode: string
  status: TestStatus
  allowCertificate: boolean
  logoUrl: string
}

interface TestFormModalProps {
  initial?: Test | null
  onClose: () => void
  onSave: (data: TestFormData, id?: string) => Promise<void>
}

export default function TestFormModal({ initial, onClose, onSave }: TestFormModalProps) {
  const [form, setForm] = useState<TestFormData>({
    title: initial?.title || '',
    subject: initial?.subject || '',
    groupIds: initial?.groups?.map((g: any) => g.groupId) || [],
    openFrom: initial?.openFrom ? initial.openFrom.slice(0, 16) : '',
    openUntil: initial?.openUntil ? initial.openUntil.slice(0, 16) : '',
    timeLimitMin: initial?.timeLimitMin || 60,
    maxAttempts: initial?.maxAttempts || 1,
    questionsCount: initial?.questionsCount || 20,
    samplingMode: initial?.samplingMode || 'FROM_BANK',
    categoryQuotas: initial?.categoryQuotas?.map((cq) => ({
      categoryId: cq.categoryId,
      quota: cq.quota,
    })) || [],
    scoringMode: initial?.scoringMode || 'SUM',
    multiScoringMode: initial?.multiScoringMode || 'ALL_OR_NOTHING',
    passThreshold: initial?.passThreshold ?? 60,
    showResultMode: initial?.showResultMode || 'AFTER_FINISH',
    status: initial?.status || 'DRAFT',
    allowCertificate: initial?.allowCertificate ?? true,
    logoUrl: initial?.logoUrl || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'timing' | 'questions' | 'scoring'>('basic')

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories')
      return res.data
    },
  })

  const toggleGroup = (id: string) => {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id)
        ? f.groupIds.filter((gid) => gid !== id)
        : [...f.groupIds, id],
    }))
  }

  const addCategoryQuota = () => {
    if (!categories || form.categoryQuotas.length >= (categories?.length || 0)) return
    setForm((f) => ({
      ...f,
      categoryQuotas: [...f.categoryQuotas, { categoryId: '', quota: 5 }],
    }))
  }

  const updateQuota = (idx: number, field: keyof CategoryQuotaInput, value: string | number) => {
    setForm((f) => ({
      ...f,
      categoryQuotas: f.categoryQuotas.map((q, i) =>
        i === idx ? { ...q, [field]: field === 'quota' ? Number(value) : value } : q
      ),
    }))
  }

  const removeQuota = (idx: number) => {
    setForm((f) => ({
      ...f,
      categoryQuotas: f.categoryQuotas.filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const dataToSave = {
        ...form,
        openFrom: (form.openFrom && form.openFrom.trim() !== '') ? new Date(form.openFrom).toISOString() : null,
        openUntil: (form.openUntil && form.openUntil.trim() !== '') ? new Date(form.openUntil).toISOString() : null,
      }
      await onSave(dataToSave as any, initial?.id)
      onClose()
    } catch (err: unknown) {
      setError(
        getApiError(err, 'Помилка збереження')
      )
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Основне' },
    { id: 'timing', label: 'Час та спроби' },
    { id: 'questions', label: 'Питання' },
    { id: 'scoring', label: 'Оцінювання' },
  ] as const

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-unbounded text-lg font-bold text-white">
            {initial ? 'Редагувати тест' : 'Створити тест'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-purple-accent text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeTab !== 'scoring') {
              e.preventDefault()
            }
          }}
        >
          {/* Basic tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Назва тесту</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="glass-input"
                placeholder="Наприклад: Основи JavaScript"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Предмет</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="glass-input"
                  placeholder="Наприклад: Програмування"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Брендування (URL логотипу)</label>
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className="glass-input"
                  placeholder="PNG без фону..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-purple-accent/5 border border-purple-accent/20 rounded-2xl">
              <input
                type="checkbox"
                id="allowCertificate"
                checked={form.allowCertificate}
                onChange={(e) => setForm({ ...form, allowCertificate: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-purple-accent focus:ring-purple-500/50"
              />
              <label htmlFor="allowCertificate" className="flex-1 cursor-pointer">
                <span className="block text-sm font-bold text-white">Дозволити видачу сертифікату</span>
                <span className="block text-slate-400 text-[10px]">Стимулює студентів покращувати результати</span>
              </label>
            </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Групи</label>
                <div className="flex flex-wrap gap-2">
                  {groups?.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                        form.groupIds.includes(g.id)
                          ? 'bg-purple-accent/30 text-white border-purple-accent/60'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                  {(!groups || groups.length === 0) && (
                    <p className="text-slate-500 text-sm">Груп не знайдено</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Статус</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TestStatus })}
                  className="glass-input"
                >
                  <option value="DRAFT" className="bg-gray-900">Чернетка</option>
                  <option value="OPEN" className="bg-gray-900">Відкрито</option>
                  <option value="CLOSED" className="bg-gray-900">Закрито</option>
                </select>
              </div>
            </div>
          )}

          {/* Timing tab */}
          {activeTab === 'timing' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-accent/5 border border-purple-accent/10">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-purple-400 font-semibold uppercase mr-1">Підказка:</span>
                  Якщо ви не оберете дати, тест буде доступний студентам завжди (після зміни статусу на "Відкрито").
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Дата відкриття</span>
                    <button type="button" onClick={() => setForm({ ...form, openFrom: '' })} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold">Очистити</button>
                  </label>
                  <input
                    type="datetime-local" value={form.openFrom}
                    onChange={(e) => setForm({ ...form, openFrom: e.target.value })}
                    className="glass-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Дедлайн (закриття)</span>
                    <button type="button" onClick={() => setForm({ ...form, openUntil: '' })} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold">Очистити</button>
                  </label>
                  <input
                    type="datetime-local" value={form.openUntil}
                    onChange={(e) => setForm({ ...form, openUntil: e.target.value })}
                    className="glass-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Обмеження часу (хв)</label>
                  <input
                    type="number" required min="1" max="300" value={form.timeLimitMin}
                    onChange={(e) => setForm({ ...form, timeLimitMin: Number(e.target.value) })}
                    className="glass-input"
                    placeholder="Напр. 60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Кількість спроб</label>
                  <input
                    type="number" required min="1" max="10" value={form.maxAttempts}
                    onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                    className="glass-input"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Questions tab */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Кількість питань</label>
                <input
                  type="number" required min="1" max="100" value={form.questionsCount}
                  onChange={(e) => setForm({ ...form, questionsCount: Number(e.target.value) })}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Режим вибірки</label>
                <div className="space-y-2">
                  {[
                    { value: 'FROM_BANK', label: 'З усього банку', desc: 'Рандомні питання з активних' },
                    { value: 'BY_CATEGORY', label: 'За категоріями', desc: 'Задати кількість з кожної категорії' },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.samplingMode === opt.value
                        ? 'bg-purple-accent/10 border-purple-accent/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}>
                      <input
                        type="radio" name="samplingMode" value={opt.value}
                        checked={form.samplingMode === opt.value}
                        onChange={(e) => setForm({ ...form, samplingMode: e.target.value })}
                        className="mt-0.5 accent-purple-500"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{opt.label}</p>
                        <p className="text-slate-400 text-xs">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.samplingMode === 'BY_CATEGORY' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">Квоти за категоріями</label>
                    <button
                      type="button" onClick={addCategoryQuota}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      + Додати
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {form.categoryQuotas.map((cq, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={cq.categoryId}
                          onChange={(e) => updateQuota(idx, 'categoryId', e.target.value)}
                          className="glass-input flex-1 py-2 text-sm"
                        >
                          <option value="" className="bg-gray-900">Категорія...</option>
                          {categories?.map((c) => (
                            <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                          ))}
                        </select>
                        <input
                          type="number" min="1" max="50" value={cq.quota}
                          onChange={(e) => updateQuota(idx, 'quota', e.target.value)}
                          className="glass-input w-20 py-2 text-sm text-center"
                          placeholder="К-сть"
                        />
                        <button
                          type="button" onClick={() => removeQuota(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {form.categoryQuotas.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-2">Натисніть "+ Додати" щоб задати квоти</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Scoring tab */}
          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Режим оцінювання</label>
                <select
                  value={form.scoringMode}
                  onChange={(e) => setForm({ ...form, scoringMode: e.target.value })}
                  className="glass-input"
                >
                  <option value="SUM" className="bg-gray-900">Сума балів за питання</option>
                  <option value="PERCENTAGE" className="bg-gray-900">Відсоткова шкала (0-100)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Оцінювання MULTI</label>
                <select
                  value={form.multiScoringMode}
                  onChange={(e) => setForm({ ...form, multiScoringMode: e.target.value })}
                  className="glass-input"
                >
                  <option value="ALL_OR_NOTHING" className="bg-gray-900">Тільки всі правильні (Все або нічого)</option>
                  <option value="PARTIAL" className="bg-gray-900">Часткове (пропорційно правильним)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Прохідний бал {form.scoringMode === 'PERCENTAGE' ? '(%)' : '(бали)'}
                </label>
                <input
                  type="number" min="0" max="1000"
                  value={form.passThreshold}
                  onChange={(e) => setForm({
                    ...form,
                    passThreshold: e.target.value ? Number(e.target.value) : '',
                  })}
                  className="glass-input"
                  placeholder="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Показати результат</label>
                <select
                  value={form.showResultMode}
                  onChange={(e) => setForm({ ...form, showResultMode: e.target.value })}
                  className="glass-input"
                >
                  <option value="AFTER_FINISH" className="bg-gray-900">Одразу після здачі</option>
                  <option value="ADMIN_ONLY" className="bg-gray-900">Тільки адміністратору</option>
                </select>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-white/10">
            <button type="button" onClick={onClose} className="flex-1 btn-ghost">Скасувати</button>
            <button type="submit" disabled={loading} className="flex-1 btn-secondary disabled:opacity-50">
              {loading ? 'Збереження...' : 'Зберегти тест'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
