import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import apiClient from '../../api/client'
import { DashboardStats, Test } from '../../types'

// ─── Animation variants ────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0, 0, 1] as [number,number,number,number] } },
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({
  label, value, icon, accent, delta,
}: {
  label: string
  value: number | undefined
  icon: React.ReactNode
  accent: string
  delta?: string
}) {
  return (
    <motion.div variants={item} className="glass-card p-5 flex gap-4 items-center group hover:border-white/15 transition-colors duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="font-unbounded text-2xl font-bold text-white tabular-nums">
            {value ?? '—'}
          </p>
          {delta && <span className="text-xs text-emerald-400 font-semibold">{delta}</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Status helpers ───────────────────────────────────────────
function getStatusLabel(status: Test['status']): string {
  if (status === 'DRAFT') return 'Чернетка'
  if (status === 'OPEN') return 'Відкрито'
  if (status === 'CLOSED') return 'Закрито'
  return status
}
function getStatusClass(status: Test['status']): string {
  if (status === 'DRAFT') return 'status-badge status-draft'
  if (status === 'OPEN') return 'status-badge status-open'
  if (status === 'CLOSED') return 'status-badge status-closed'
  return 'status-badge'
}

// ─── Skeleton row ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-4"><div className="skeleton h-4 w-48 mb-1.5" /><div className="skeleton h-3 w-24" /></td>
      <td className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>
      <td className="px-5 py-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>
    </tr>
  )
}

// ─── Custom tooltip for area chart ───────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{payload[0]?.name}</p>
      <p className="text-white font-semibold">{payload[0]?.value}</p>
    </div>
  )
}

// ─── Status distribution pie ──────────────────────────────────
const PIE_COLORS = {
  OPEN:   '#10b981',
  CLOSED: '#ef4444',
  DRAFT:  '#64748b',
}

function getPieColor(status: string): string {
  if (status === 'OPEN') return PIE_COLORS.OPEN
  if (status === 'CLOSED') return PIE_COLORS.CLOSED
  if (status === 'DRAFT') return PIE_COLORS.DRAFT
  return '#8b5cf6'
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats')
      return res.data
    },
  })

  // Build status distribution from all tests via testStatusCounts
  const statusCounts = stats?.testStatusCounts ?? { OPEN: 0, CLOSED: 0, DRAFT: 0 }
  const pieData = Object.entries(statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: getStatusLabel(status as Test['status']),
      value,
      color: getPieColor(status),
    }))

  // Activity history (attempts over the last 7 days)
  const areaData = stats?.dailyActivity ?? []

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Дашборд</h1>
        <p className="text-slate-500 text-sm">Загальна статистика системи тестування</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Всього тестів"
          value={stats?.totalTests}
          accent="bg-purple-500/15 border border-purple-500/20"
          icon={
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Студентів"
          value={stats?.totalStudents}
          accent="bg-pink-500/15 border border-pink-500/20"
          icon={
            <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Питань у банку"
          value={stats?.totalQuestions}
          accent="bg-emerald-500/15 border border-emerald-500/20"
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      {!isLoading && stats && (
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area chart */}
          <div className="lg:col-span-2 glass-card p-5">
            <p className="text-sm font-semibold text-white mb-4">Активність тестування (спроби за останні 7 днів)</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#a78bfa' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="glass-card p-5 flex flex-col">
            <p className="text-sm font-semibold text-white mb-4">Статус тестів</p>
            {pieData.length > 0 ? (
              <>
                <div className="flex-1 flex items-center justify-center">
                  <PieChart width={110} height={110}>
                    <Pie
                      data={pieData}
                      cx={50}
                      cy={50}
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.85} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-white font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-600 text-xs">Немає даних</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Active tests table */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-unbounded text-base font-semibold text-white">Активні тести</h2>
          <button
            onClick={() => navigate('/admin/tests')}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-medium"
          >
            Всі тести
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Назва</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Предмет</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Дія</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                ) : stats?.activeTests && stats.activeTests.length > 0 ? (
                  stats.activeTests.map((test) => (
                    <motion.tr
                      key={test.id}
                      className="table-row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="px-5 py-4">
                        <div className="text-white font-medium text-sm mb-1">{test.title}</div>
                        <div className="flex flex-wrap gap-1">
                          {(test as any).groups?.map((tg: any, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-500">
                              {tg.group.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-sm">{test.subject || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={getStatusClass(test.status)}>
                          {getStatusLabel(test.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigate(`/admin/tests/${test.id}/results`)}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                        >
                          Результати →
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-slate-600 text-sm">Немає активних тестів</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
