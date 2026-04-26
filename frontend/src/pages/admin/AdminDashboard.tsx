import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { DashboardStats, Test } from '../../types'

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number | undefined
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="font-unbounded text-2xl font-bold text-white">
          {value ?? '—'}
        </p>
      </div>
    </div>
  )
}

function getStatusLabel(status: Test['status']) {
  const map: Record<Test['status'], string> = {
    DRAFT: 'Чернетка',
    OPEN: 'Відкрито',
    CLOSED: 'Закрито',
  }
  return map[status]
}

function getStatusClass(status: Test['status']) {
  const map: Record<Test['status'], string> = {
    DRAFT: 'status-badge status-draft',
    OPEN: 'status-badge status-open',
    CLOSED: 'status-badge status-closed',
  }
  return map[status]
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

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-unbounded text-2xl font-bold text-white mb-1">Дашборд</h1>
        <p className="text-slate-400 text-sm">Загальна статистика системи тестування</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Всього тестів"
          value={stats?.totalTests}
          color="bg-purple-accent/20 border border-purple-accent/30"
          icon={
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Студентів"
          value={stats?.totalStudents}
          color="bg-pink-accent/20 border border-pink-accent/30"
          icon={
            <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Питань у банку"
          value={stats?.totalQuestions}
          color="bg-green-cta/10 border border-green-cta/20"
          icon={
            <svg className="w-6 h-6 text-green-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Active tests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-unbounded text-lg font-semibold text-white">Активні тести</h2>
          <button
            onClick={() => navigate('/admin/tests')}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 flex items-center gap-1"
          >
            Всі тести
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : stats?.activeTests && stats.activeTests.length > 0 ? (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Назва</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Предмет</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Дія</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.activeTests.map((test) => (
                    <tr key={test.id} className="table-row">
                      <td className="px-5 py-4">
                        <div className="text-white font-medium mb-1">{test.title}</div>
                        <div className="flex flex-wrap gap-1">
                          {(test as any).groups?.map((tg: any, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                              {tg.group.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm">{test.subject || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={getStatusClass(test.status)}>
                          {getStatusLabel(test.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigate(`/admin/tests/${test.id}/results`)}
                          className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
                        >
                          Результати →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-400 text-sm">Немає активних тестів</p>
          </div>
        )}
      </div>
    </div>
  )
}
