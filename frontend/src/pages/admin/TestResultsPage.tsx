import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { TestAttempt, Group } from '../../types'

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

export default function TestResultsPage() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const [groupFilter, setGroupFilter] = useState('')
  const [page, setPage] = useState(1)

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

      {/* Filters */}
      <div className="flex items-center gap-3">
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
                          <span className="text-orange-400 font-semibold text-sm">
                            {a.suspiciousEvents?.length}
                          </span>
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
    </div>
  )
}
