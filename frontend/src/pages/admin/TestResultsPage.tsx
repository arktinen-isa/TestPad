import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  const s = secs % 60
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
          <div key={q.questionId} className="px-5 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{q.questionText}</p>
              <p className="text-slate-500 text-xs">{q.totalAnswered} відповідей</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-semibold mb-1"
                style={{ color: q.correctPct >= 75 ? '#4ade80' : q.correctPct >= 40 ? '#facc15' : '#f87171' }}>
                {q.correctPct.toFixed(0)}%
              </div>
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
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

  const { data, isLoading } = useQuery<ResultsResponse>({
    queryKey: ['test-results', testId, groupFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 30 }
      if (groupFilter) params.groupId = groupFilter
      const res = await apiClient.get(`/tests/${testId}/results`, { params })
      return res.data
    },
    enabled: !!testId,
  })

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
          className="mt-1 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      <div className="flex flex-wrap items-center gap-3">
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
          Експорт CSV
        </button>
      </div>

      {/* Question difficulty stats */}
      {showStats && testId && <QuestionStatsPanel testId={testId} />}

      {/* Table */}
      <div className="glass-card overflow-hidden">
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
                        {a.user?.group?.name ?? '—'}
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
                    </tr>
                  )
                })}
                {(!data?.attempts || data.attempts.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
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
        <div className="flex items-center justify-center gap-3">
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
    </div>
  )
}
