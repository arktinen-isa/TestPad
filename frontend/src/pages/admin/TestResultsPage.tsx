import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { TestAttempt, Group, SuspiciousEvent } from '../../types'

interface ResultsResponse {
  test: { id: string; title: string; subject?: string; passThreshold?: number }
  attempts: TestAttempt[]
  total: number
  stats: { avgScore: number; avgPct: number; passCount: number }
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(secs?: number) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}хв ${s}с`
}

interface QuestionStat {
  questionId: string
  questionText: string
  questionType: string
  totalAnswered: number
  correctCount: number
  correctPct: number
}

function SuspiciousModal({ attemptId, studentName, onClose }: { attemptId: string; studentName: string; onClose: () => void }) {
  const { data: events, isLoading } = useQuery<SuspiciousEvent[]>({
    queryKey: ['suspicious', attemptId],
    queryFn: async () => {
      const res = await apiClient.get(`/suspicious/attempt/${attemptId}`)
      return res.data
    },
  })

  const EVENT_LABELS: Record<string, string> = {
    FULLSCREEN_EXIT: '↙ Вихід з повного екрану',
    TAB_SWITCH: '⇄ Перемикання вкладки',
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-unbounded text-base font-bold text-white">Підозрілі події</h3>
            <p className="text-slate-400 text-xs mt-0.5">{studentName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : events?.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">Підозрілих подій не зафіксовано</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {events?.map((ev, i) => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                <span className="text-orange-400 font-mono text-xs w-5 text-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-orange-300 text-sm font-medium">{EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(ev.occurredAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5">
          <button onClick={onClose} className="w-full btn-ghost">Закрити</button>
        </div>
      </div>
    </div>
  )
}

function QuestionStatsPanel({ testId }: { testId: string }) {
  const { data: stats, isLoading } = useQuery<QuestionStat[]>({
    queryKey: ['question-stats', testId],
    queryFn: async () => {
      const res = await apiClient.get(`/tests/${testId}/stats/questions`)
      return res.data
    },
  })

  if (isLoading) return (
    <div className="glass-card p-6 text-center">
      <div className="w-6 h-6 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!stats?.length) return (
    <div className="glass-card p-6 text-center text-slate-400 text-sm">Статистика недоступна</div>
  )

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-unbounded text-sm font-bold text-white">Складність питань</h3>
        <p className="text-slate-400 text-xs mt-0.5">Відсортовано від найскладніших до найлегших</p>
      </div>
      <div className="divide-y divide-white/5">
        {stats.map((q) => (
          <div key={q.questionId} className="px-5 py-3 flex items-center gap-4 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-white text-sm truncate font-medium group-hover:text-purple-300 transition-colors">{q.questionText}</p>
                {q.correctPct < 40 && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-tighter animate-pulse">
                    Складне
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">{q.totalAnswered} відповідей</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-black mb-1.5 font-unbounded"
                style={{ color: q.correctPct >= 75 ? '#4ade80' : q.correctPct >= 40 ? '#facc15' : '#f87171' }}>
                {Math.round(q.correctPct)}%
              </div>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  style={{
                    width: `${q.correctPct}%`,
                    background: q.correctPct >= 75 ? '#4ade80' : q.correctPct >= 40 ? '#facc15' : '#f87171',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TestResultsPage() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const [groupFilter, setGroupFilter] = useState('')
  const [page, setPage] = useState(1)
  const [suspiciousModal, setSuspiciousModal] = useState<{ attemptId: string; studentName: string } | null>(null)
  const [showStats, setShowStats] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery<ResultsResponse>({
    queryKey: ['test-results', testId, groupFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 30 }
      if (groupFilter) params.groupId = groupFilter
      const res = await apiClient.get(`/tests/${testId}/results`, { params })
      return res.data
    },
    enabled: !!testId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/attempts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['test-results'] })
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Помилка при видаленні спроби')
      setDeleteConfirmId(null)
    }
  })

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: groups } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/admin/tests')}
          className="mt-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all no-print"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="no-print">
          <h1 className="font-unbounded text-2xl font-bold text-white mb-1">
            {data?.test.title ?? 'Результати тесту'}
          </h1>
          {data?.test.subject && (
            <p className="text-slate-400 text-sm">{data.test.subject}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {data?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Середній бал</p>
            <p className="font-unbounded text-2xl font-bold text-white">
              {data.stats.avgPct.toFixed(1)}%
            </p>
          </div>
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Всього спроб</p>
            <p className="font-unbounded text-2xl font-bold text-white">{data.total}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-slate-400 text-sm mb-1">Зараховано</p>
            <p className="font-unbounded text-2xl font-bold text-green-400">
              {data.stats.passCount}{' '}
              <span className="text-slate-400 text-base font-normal">/ {data.total}</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <select
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setPage(1) }}
          className="glass-input max-w-[200px] py-2"
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
          Складність питань
        </button>

        <button
          onClick={() => {
            window.open(`/api/tests/${testId}/results/export?groupId=${groupFilter}`, '_blank')
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-accent hover:bg-purple-600 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Звіт PDF
        </button>
      </div>

      {/* Question difficulty stats */}
      {showStats && testId && <div className="no-print"><QuestionStatsPanel testId={testId} /></div>}

      {/* Table */}
      <div className="glass-card overflow-hidden no-print">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Студент</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Група</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Спроба</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Дата</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Бал</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">%</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Час</th>
                   <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Підозр.</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody>
                {data?.attempts.map((a, idx) => {
                  const pct = a.maxScore ? ((a.score ?? 0) / a.maxScore) * 100 : 0
                  const passed =
                    data.test.passThreshold != null
                      ? pct >= data.test.passThreshold
                      : null
                  return (
                    <tr key={a.id} className="table-row">
                      <td className="px-5 py-4">
                        <p className="text-white font-medium text-sm">{a.user?.name ?? '—'}</p>
                        <p className="text-slate-500 text-xs">{a.user?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {a.user?.groups?.[0]?.group?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">#{idx + 1}</td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {formatDate(a.finishedAt)}
                      </td>
                      <td className="px-5 py-4 text-white font-medium text-sm">
                        {a.score?.toFixed(1) ?? '—'} / {a.maxScore?.toFixed(1) ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-semibold text-sm ${pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">
                        {formatDuration(a.timeSpentSec)}
                      </td>
                      <td className="px-5 py-4">
                        {passed === null ? (
                          <span className="text-slate-500 text-xs">—</span>
                        ) : passed ? (
                          <span className="status-badge status-open">Зараховано</span>
                        ) : (
                          <span className="status-badge status-closed">Не зараховано</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {(a.suspiciousEvents?.length ?? 0) > 0 ? (
                          <button
                            onClick={() => setSuspiciousModal({ attemptId: a.id, studentName: a.user?.name ?? '—' })}
                            className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold text-sm transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {a.suspiciousEvents?.length}
                          </button>
                         ) : (
                          <span className="text-slate-600 text-sm">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setDeleteConfirmId(a.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Видалити результат"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {(!data?.attempts || data.attempts.length === 0) && (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-400">
                      Результатів не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 30 && (
        <div className="flex items-center justify-center gap-3 no-print">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            ← Попередня
          </button>
          <span className="text-slate-400 text-sm">
            Сторінка {page} з {Math.ceil(data.total / 30)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / 30)}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            Наступна →
          </button>
        </div>
      )}

      {suspiciousModal && (
        <SuspiciousModal
          attemptId={suspiciousModal.attemptId}
          studentName={suspiciousModal.studentName}
          onClose={() => setSuspiciousModal(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm text-center">
            <h3 className="font-unbounded text-lg font-bold text-white mb-2">Видалити результат?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Видалення результату дозволить студенту використати цю спробу ще раз. Ця дія незворотна.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 btn-ghost">Скасувати</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 btn-danger disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Видалення...' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Протокол тестування</p>
          </div>
          <div className="text-right text-[10px] font-mono">
            <p>ДАТА: {new Date().toLocaleDateString('uk-UA')}</p>
            <p>ID: {testId ? testId.substring(0, 8).toUpperCase() : '—'}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6 border-l-4 border-black pl-4">{data?.test.title}</h2>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div className="p-5 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Дисципліна</p>
              <p className="font-bold text-base">{data?.test.subject || '—'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-none">
              <p className="text-gray-500 uppercase text-[9px] font-black mb-1">Підсумок групи</p>
              <div className="flex justify-between">
                <div>
                  <p className="text-[10px]">Середній бал</p>
                  <p className="font-bold text-lg">{data?.stats.avgPct.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px]">Склали</p>
                  <p className="font-bold text-lg text-green-600">{data?.stats.passCount} / {data?.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-black mb-4 bg-black text-white px-4 py-1.5 uppercase tracking-widest">Відомість результатів</h3>
        <table className="w-full text-xs mb-12 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-2 border-black">
              <th className="text-left font-black p-3 border-r-2 border-black">ПІБ СТУДЕНТА</th>
              <th className="text-left font-black p-3 border-r-2 border-black">ГРУПА</th>
              <th className="text-center font-black p-3 border-r-2 border-black">РЕЗУЛЬТАТ (%)</th>
              <th className="text-center font-black p-3 border-r-2 border-black">ЧАС ТЕСТУ</th>
              <th className="text-center font-black p-3">СТАТУС</th>
            </tr>
          </thead>
          <tbody>
            {data?.attempts.map(a => {
              const pct = (a.maxScore ?? 0) > 0 ? ((a.score ?? 0) / (a.maxScore ?? 1)) * 100 : 0
              return (
                <tr key={a.id} className="border-b-2 border-x-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">{a.user?.name ?? '—'}</td>
                  <td className="p-3 border-r-2 border-black">{a.user?.groups?.[0]?.group?.name || '—'}</td>
                  <td className="p-3 border-r-2 border-black text-center whitespace-nowrap">
                    <span className="font-black text-sm">{pct.toFixed(1)}%</span>
                    <span className="text-[10px] text-gray-500 ml-1">({a.score} / {a.maxScore})</span>
                  </td>
                  <td className="p-3 border-r-2 border-black text-center font-mono">
                    {formatDuration(a.finishedAt ? (new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime())/1000 : 0)}
                  </td>
                  <td className={`p-3 text-center font-black ${a.passed ? 'text-green-700' : 'text-red-700'}`}>
                    {a.passed ? 'ЗАРАХОВАНО' : 'НЕ ЗАРАХОВАНО'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-auto border-t-4 border-black pt-4">
          <div className="text-[9px] text-gray-500 max-w-md">
            <p className="font-bold text-black mb-1 italic">Довідка:</p>
            Цей протокол згенеровано автоматично системою GradeX. Дані є офіційним підтвердженням результатів тестування та перевірені алгоритмами анти-чит системи на наявність підозрілих подій та маніпуляцій з вікном браузера.
          </div>
        </div>
      </div>
    </div>
  )
}
