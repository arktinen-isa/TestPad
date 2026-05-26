import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Form, FormSubmission, Group } from '../../types'
import { t } from '../../utils/i18n'

function normalizeValue(val?: string): string {
  if (!val) return '—'
  if (val === 'true') return 'Так'
  if (val === 'false') return 'Ні'
  return val
}

function checkAnswer(userVal?: string, correctVal?: string): boolean {
  if (!userVal || !correctVal) return false
  const u = userVal.trim().toLowerCase()
  const c = correctVal.trim().toLowerCase()
  if (u === c) return true
  
  const isUTrue = u === 'true' || u === 'так' || u === 'yes' || u === '1'
  const isCTrue = c === 'true' || c === 'так' || c === 'yes' || c === '1'
  const isUFalse = u === 'false' || u === 'ні' || u === 'no' || u === '0'
  const isCFalse = c === 'false' || c === 'ні' || c === 'no' || c === '0'
  
  if (isUTrue && isCTrue) return true
  if (isUFalse && isCFalse) return true
  return false
}

interface FormStatsPanelProps {
  form?: Form
  submissions: FormSubmission[]
}

function FormStatsPanel({ form, submissions }: FormStatsPanelProps) {
  if (!form || !submissions || submissions.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-slate-400 text-sm">
        Немає даних для розрахунку статистики
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {form.fields?.map((field) => {
        const values = submissions
          .map((s) => s.values?.find((v) => v.fieldId === field.id)?.value)
          .filter((v): v is string => v !== undefined && v !== null && v.trim() !== '')

        const totalAnswers = values.length
        const hasCorrectAnswer = field.correctAnswer && field.correctAnswer.trim() !== ''
        let correctCount = 0
        if (hasCorrectAnswer && totalAnswers > 0) {
          values.forEach((v) => {
            if (checkAnswer(v, field.correctAnswer || undefined)) {
              correctCount++
            }
          })
        }
        const successRate = totalAnswers > 0 ? (correctCount / totalAnswers) * 100 : 0

        let statsContent = null

        if (field.type === 'BOOLEAN') {
          let yesCount = 0
          let noCount = 0
          values.forEach((v) => {
            const normalized = v.trim().toLowerCase()
            if (normalized === 'true' || normalized === 'так' || normalized === 'yes' || normalized === '1') {
              yesCount++
            } else {
              noCount++
            }
          })

          const yesPct = totalAnswers > 0 ? (yesCount / totalAnswers) * 100 : 0
          const noPct = totalAnswers > 0 ? (noCount / totalAnswers) * 100 : 0

          statsContent = (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Так: <strong className="text-emerald-400">{yesCount}</strong> ({yesPct.toFixed(1)}%)</span>
                <span>Ні: <strong className="text-red-400">{noCount}</strong> ({noPct.toFixed(1)}%)</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${yesPct}%` }}
                  title={`Так: ${yesPct.toFixed(1)}%`}
                />
                <div
                  className="bg-red-400 h-full transition-all duration-500"
                  style={{ width: `${noPct}%` }}
                  title={`Ні: ${noPct.toFixed(1)}%`}
                />
              </div>
            </div>
          )
        } else if (field.type === 'INTEGER' || field.type === 'FLOAT') {
          const numbers = values
            .map((v) => parseFloat(v))
            .filter((n) => !isNaN(n))

          if (numbers.length === 0) {
            statsContent = (
              <p className="text-slate-500 text-xs py-2 italic text-center">
                Немає числових відповідей
              </p>
            )
          } else {
            const min = Math.min(...numbers)
            const max = Math.max(...numbers)
            const avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
            const isFloat = field.type === 'FLOAT'
            const formatNum = (n: number) => isFloat ? n.toFixed(2) : Math.round(n).toString()

            const range = max - min
            const avgPctFromMin = range > 0 ? ((avg - min) / range) * 100 : 50

            statsContent = (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Мін</p>
                    <p className="text-sm font-bold text-slate-300 font-mono">{formatNum(min)}</p>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-purple-accent/10 border border-purple-accent/20">
                    <p className="text-[10px] text-purple-300 uppercase tracking-wider mb-0.5">Сер</p>
                    <p className="text-sm font-black text-purple-200 font-mono">{formatNum(avg)}</p>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Макс</p>
                    <p className="text-sm font-bold text-slate-300 font-mono">{formatNum(max)}</p>
                  </div>
                </div>

                {range > 0 && (
                  <div className="relative pt-2 pb-1">
                    <div className="h-1 bg-white/10 rounded-full" />
                    <div 
                      className="absolute top-1.5 w-2 h-2 -ml-1 rounded-full bg-purple-accent shadow-[0_0_8px_#7c3aed]"
                      style={{ left: `${avgPctFromMin}%` }}
                    />
                  </div>
                )}
              </div>
            )
          }
        } else {
          const uniqueTexts = Array.from(new Set(values)).slice(-4).reverse()

          statsContent = (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Останні унікальні відповіді:</p>
              {uniqueTexts.length === 0 ? (
                <p className="text-slate-500 text-xs py-2 italic text-center">Відповіді відсутні</p>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {uniqueTexts.map((text, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 truncate font-medium hover:bg-white/10 transition-colors" title={text}>
                      {text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <div key={field.id} className="glass-card flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-unbounded text-xs font-bold text-white leading-relaxed line-clamp-2">
                    {field.label}
                  </h4>
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-slate-400 font-mono tracking-wider">
                    {field.type === 'BOOLEAN' ? 'ТАК/НІ' : field.type === 'INTEGER' ? 'ЦІЛЕ' : field.type === 'FLOAT' ? 'ДІЙСНЕ' : 'ТЕКСТ'}
                  </span>
                </div>
                <p className="text-slate-500 text-[10px] font-medium">{totalAnswers} відповідей</p>
              </div>

              <div className="pt-2">{statsContent}</div>

              {hasCorrectAnswer && totalAnswers > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Правильних: <strong>{correctCount}</strong></span>
                  </div>
                  <span className="font-unbounded text-xs font-black text-emerald-400">
                    {successRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FormResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [showStats, setShowStats] = useState(false)

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })

  const { data: form } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await apiClient.get(`/forms/${id}`)
      return res.data
    }
  })

  const { data: submissions, isLoading, refetch, isFetching } = useQuery<FormSubmission[]>({
    queryKey: ['form-results', id, groupFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (groupFilter) params.groupId = groupFilter
      const res = await apiClient.get(`/forms/${id}/results`, { params })
      return res.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      await apiClient.delete(`/forms/submissions/${submissionId}`)
    },
    onSuccess: () => {
      refetch()
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error || 'Помилка при видаленні результату'
      alert(errMsg)
    }
  })

  const selectedGroupName = groups?.find((g) => g.id === groupFilter)?.name || 'Всі групи'

  // Calculate evaluation info with useMemo
  const fieldsWithCorrect = useMemo(() => {
    return form?.fields?.filter(f => f.correctAnswer && f.correctAnswer.trim() !== '') || []
  }, [form])

  const hasEvaluation = fieldsWithCorrect.length > 0

  // Memoize filtered submissions to avoid heavy filtering on every render
  const filteredSubmissions = useMemo(() => {
    return submissions?.filter(s => {
      if (!searchQuery) return true
      const name = s.user?.name?.toLowerCase() || ''
      const email = s.user?.email?.toLowerCase() || ''
      return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase())
    }) || []
  }, [submissions, searchQuery])

  // Memoize average success percentage
  const avgPct = useMemo(() => {
    if (!hasEvaluation || filteredSubmissions.length === 0) return 0
    let totalPcts = 0
    filteredSubmissions.forEach(s => {
      let correct = 0
      fieldsWithCorrect.forEach(f => {
        const userVal = s.values?.find(v => v.fieldId === f.id)?.value
        if (checkAnswer(userVal, f.correctAnswer || undefined)) {
          correct++
        }
      })
      totalPcts += (correct / fieldsWithCorrect.length) * 100
    })
    return totalPcts / filteredSubmissions.length
  }, [hasEvaluation, filteredSubmissions, fieldsWithCorrect])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button 
          onClick={() => navigate('/admin/forms')}
          className="mt-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all no-print"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="no-print">
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">
            {form?.title || 'Результати форми'}
          </h1>
          <p className="text-slate-400 text-sm">Перегляд та оцінка відповідей користувачів</p>
        </div>
      </div>

      {/* Stats row */}
      {submissions && submissions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Всього відповідей</p>
            <p className="font-unbounded text-2xl font-bold text-white">{submissions.length}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Оцінюваних питань</p>
            <p className="font-unbounded text-2xl font-bold text-purple-accent">
              {fieldsWithCorrect.length} <span className="text-slate-400 text-xs font-normal">із {form?.fields?.length || 0}</span>
            </p>
          </div>
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Середня успішність</p>
            <p className="font-unbounded text-2xl font-bold text-green-400">
              {hasEvaluation ? `${avgPct.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text"
            placeholder="Пошук студента за ПІБ чи email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input py-2.5 text-xs"
          />
        </div>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="glass-input max-w-[200px] py-2.5 text-xs"
        >
          <option value="">Всі групи</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          title="Оновити дані"
        >
          <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={() => setShowStats((s) => !s)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showStats
              ? 'bg-purple-accent/30 text-white border-purple-accent/50'
              : 'text-slate-300 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Зведена аналітика
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-accent hover:bg-purple-600 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Друкувати звіт
        </button>
      </div>

      {showStats && (
        <div className="no-print animate-fade-in">
          <FormStatsPanel form={form} submissions={filteredSubmissions} />
        </div>
      )}

      {/* Main Table */}
      <div className="glass-card overflow-hidden no-print">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !filteredSubmissions.length ? (
          <div className="py-20 text-center text-slate-500">
            Результатів за запитом не знайдено
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[200px]">Користувач</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Група</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата подання</th>
                  {hasEvaluation && (
                    <>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Правильних</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Успішність</th>
                    </>
                  )}
                  {form?.fields?.map(f => (
                    <th key={f.id} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[180px]">
                      {f.label}
                      {f.correctAnswer && (
                        <span className="block text-[9px] text-purple-400 font-extrabold uppercase mt-0.5 tracking-wider">
                          Еталон: {f.correctAnswer}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[100px] no-print">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(s => {
                  let correct = 0
                  if (hasEvaluation) {
                    fieldsWithCorrect.forEach(f => {
                      const userVal = s.values?.find(v => v.fieldId === f.id)?.value
                      if (checkAnswer(userVal, f.correctAnswer || undefined)) {
                        correct++
                      }
                    })
                  }
                  const pct = fieldsWithCorrect.length > 0 ? (correct / fieldsWithCorrect.length) * 100 : 0

                  return (
                    <tr key={s.id} className="table-row">
                      <td className="px-5 py-4">
                        <p className="text-white font-medium text-sm">{s.user?.name}</p>
                        <p className="text-slate-500 text-xs">{s.user?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {s.user?.groups?.[0]?.group?.name || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {new Date(s.submittedAt).toLocaleString('uk-UA')}
                      </td>
                      {hasEvaluation && (
                        <>
                          <td className="px-5 py-4 text-white font-bold text-sm">
                            {correct} / {fieldsWithCorrect.length}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`font-semibold text-sm ${pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                        </>
                      )}
                      {form?.fields?.map(f => {
                        const val = s.values?.find(v => v.fieldId === f.id)?.value
                        const isFieldEvaluated = f.correctAnswer && f.correctAnswer.trim() !== ''
                        const isCorrect = isFieldEvaluated && checkAnswer(val, f.correctAnswer || undefined)

                        return (
                          <td key={f.id} className="px-5 py-4 text-sm">
                            <div className="flex flex-col">
                              <span className={isFieldEvaluated ? (isCorrect ? 'text-green-400 font-medium' : 'text-red-400') : 'text-white'}>
                                {normalizeValue(val)}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-5 py-4 text-right no-print">
                        <button
                          onClick={() => {
                            if (confirm('Ви дійсно хочете видалити цей результат?')) {
                              deleteMutation.mutate(s.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
                          title="Видалити результат"
                        >
                          {deleteMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print-only Report Template */}
      <div className="print-only p-12 bg-white text-black">
        <style>{`
          @media print {
            @page { size: auto; margin: 15mm; }
            body { 
              background: white !important; 
              color: black !important; 
              padding: 0 !important; 
              margin: 0 !important; 
              overflow: visible !important; 
            }
            
            /* Completely hide all UI layout wrappers */
            .no-print, aside, nav, button, .admin-sidebar, #admin-sidebar, .sidebar, 
            .glass-card, .btn-ghost, .btn-secondary, .btn-danger, header, .pagination, select { 
              display: none !important; 
            }
            
            /* Remove margins, padding, borders, shadows and backgrounds on all wrapping container divs */
            div, main, section {
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding: 0 !important;
              background: none !important;
              background-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }

            /* Configure print-only layout to span full width */
            .print-only { 
              display: flex !important; 
              flex-direction: column !important;
              width: 100% !important; 
              padding: 0 !important; 
              margin: 0 !important;
              position: static !important;
              background: white !important;
              color: black !important;
            }
            main { 
              padding: 0 !important; 
              margin: 0 !important; 
              width: 100% !important; 
              max-width: 100% !important; 
              display: block !important; 
            }
            * { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
          }
        `}</style>
        
        <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase mb-1 tracking-tighter">{t('GradeX Report')}</h1>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Протокол результатів опитування</p>
          </div>
          <div className="text-right text-[10px] font-mono">
            <p>ДАТА: {new Date().toLocaleDateString('uk-UA')}</p>
            <p>ID: {id ? id.substring(0, 8).toUpperCase() : '—'}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6 border-l-4 border-black pl-4">{form?.title}</h2>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="p-4 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Опис опитування</p>
              <p className="font-bold text-sm truncate">{form?.description || '—'}</p>
            </div>
            <div className="p-4 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Група</p>
              <p className="font-bold text-sm truncate">{selectedGroupName}</p>
            </div>
            <div className="p-4 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Підсумок</p>
              <div className="flex justify-between text-xs leading-tight">
                <div>
                  <p className="text-[9px] text-gray-500">Всього відповідей</p>
                  <p className="font-bold">{submissions?.length || 0}</p>
                </div>
                {hasEvaluation && (
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500">Середня успішність</p>
                    <p className="font-bold text-purple-700">{avgPct.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-black mb-4 bg-black text-white px-4 py-1.5 uppercase tracking-widest">Відомість відповідей</h3>
        <table className="w-full text-xs mb-12 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-2 border-black">
              <th className="text-left font-black p-3 border-r-2 border-black">КОРИСТУВАЧ</th>
              <th className="text-left font-black p-3 border-r-2 border-black">ГРУПА</th>
              {hasEvaluation && <th className="text-center font-black p-3 border-r-2 border-black">УСПІШНІСТЬ (%)</th>}
              {form?.fields?.map(f => (
                <th key={f.id} className="text-left font-black p-3 border-r-2 border-black">{f.label.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map(s => {
              let correct = 0
              if (hasEvaluation) {
                fieldsWithCorrect.forEach(f => {
                  const userVal = s.values?.find(v => v.fieldId === f.id)?.value
                  if (checkAnswer(userVal, f.correctAnswer || undefined)) {
                    correct++
                  }
                })
              }
              const pct = fieldsWithCorrect.length > 0 ? (correct / fieldsWithCorrect.length) * 100 : 0
              return (
                <tr key={s.id} className="border-b-2 border-x-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">{s.user?.name ?? '—'}</td>
                  <td className="p-3 border-r-2 border-black">{s.user?.groups?.[0]?.group?.name || '—'}</td>
                  {hasEvaluation && (
                    <td className="p-3 border-r-2 border-black text-center whitespace-nowrap">
                      <span className="font-black text-sm">{pct.toFixed(1)}%</span>
                      <span className="text-[10px] text-gray-500 ml-1">({correct} / {fieldsWithCorrect.length})</span>
                    </td>
                  )}
                  {form?.fields?.map(f => (
                    <td key={f.id} className="p-3 border-r-2 border-black">{normalizeValue(s.values?.find(v => v.fieldId === f.id)?.value)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-auto border-t-4 border-black pt-4">
          <div className="text-[9px] text-gray-500 max-w-md">
            <p className="font-bold text-black mb-1 italic">Довідка:</p>
            Цей протокол згенеровано автоматично системою GradeX. Дані є офіційним підтвердженням заповнення форми опитування та результатів оцінювання відповідей.
          </div>
        </div>
      </div>
    </div>
  )
}
