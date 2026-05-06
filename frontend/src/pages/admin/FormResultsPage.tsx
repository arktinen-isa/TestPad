import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { Form, FormSubmission, Group } from '../../types'

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

export default function FormResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('')

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
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-accent hover:bg-purple-600 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Друкувати звіт
        </button>
      </div>

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
            @page { size: auto; margin: 0; }
            body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
            .no-print, aside, nav, button, .admin-sidebar, #admin-sidebar, .sidebar, .glass-card, .btn-ghost, .btn-secondary, .btn-danger, header, .pagination { 
              display: none !important; 
            }
            .print-only { 
              display: flex !important; 
              flex-direction: column !important;
              width: 100% !important; 
              padding: 20mm !important; 
              margin: 0 !important;
              position: static !important;
              min-height: 275mm !important;
              height: auto !important;
              background: white !important;
            }
            main { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; display: block !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>
        
        <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase mb-1 tracking-tighter">GradeX Report</h1>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Протокол результатів опитування</p>
          </div>
          <div className="text-right text-[10px] font-mono">
            <p>ДАТА: {new Date().toLocaleDateString('uk-UA')}</p>
            <p>ID: {id ? id.substring(0, 8).toUpperCase() : '—'}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6 border-l-4 border-black pl-4">{form?.title}</h2>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div className="p-5 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Опис опитування</p>
              <p className="font-bold text-base">{form?.description || '—'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Підсумок відповідей</p>
              <div className="flex justify-between">
                <div>
                  <p className="text-[10px]">Всього відповідей</p>
                  <p className="font-bold text-lg">{submissions?.length || 0}</p>
                </div>
                {hasEvaluation && (
                  <div className="text-right">
                    <p className="text-[10px]">Середня успішність</p>
                    <p className="font-bold text-lg text-purple-accent">{avgPct.toFixed(1)}%</p>
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
