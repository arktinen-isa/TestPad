import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { StudentTest } from '../../types'

function getPlural(n: number, one: string, few: string, many: string) {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return one;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) return few;
  return many;
}

function getTestStatusInfo(test: StudentTest) {
  const now = new Date()
  const from = test.openFrom ? new Date(test.openFrom) : null
  const until = test.openUntil ? new Date(test.openUntil) : null
  const attemptsUsed = test.attemptsUsed || 0
  const attemptsLeft = test.maxAttempts - attemptsUsed

  if (test.status === 'DRAFT') {
    return { label: 'Чернетка', color: 'status-badge status-draft', available: false }
  }
  if (test.status === 'CLOSED') {
    return { label: 'Закрито', color: 'status-badge status-closed', available: false }
  }
  if (from && now < from) {
    return { label: 'Ще не відкрито', color: 'status-badge status-draft', available: false }
  }
  if (until && now > until) {
    return { label: 'Завершено', color: 'status-badge status-closed', available: false }
  }
  if (attemptsLeft <= 0) {
    return { label: 'Вичерпано спроби', color: 'status-badge status-closed', available: false }
  }
  return { label: 'Доступний', color: 'status-badge status-open', available: true }
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-4 bg-white/10 rounded-lg w-3/4 mb-3" />
      <div className="h-3 bg-white/5 rounded-lg w-1/2 mb-6" />
      <div className="flex gap-3 mb-6">
        <div className="h-6 bg-white/10 rounded-full w-20" />
        <div className="h-6 bg-white/10 rounded-full w-24" />
      </div>
      <div className="h-10 bg-white/10 rounded-xl w-full" />
    </div>
  )
}

function TestCard({ test }: { test: StudentTest }) {
  const navigate = useNavigate()
  const status = getTestStatusInfo(test)
  const attemptsUsed = test.attemptsUsed || 0
  const attemptsLeft = test.maxAttempts - attemptsUsed

  return (
    <div className="glass-card p-6 flex flex-col gap-4 hover:border-purple-accent/30 transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-unbounded text-base font-semibold text-white group-hover:text-purple-300 transition-colors duration-200 leading-snug">
            {test.title}
          </h3>
          {test.subject && (
            <p className="text-slate-400 text-sm mt-1">{test.subject}</p>
          )}
        </div>
        <span className={status.color}>{status.label}</span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {test.timeLimitMin} {getPlural(test.timeLimitMin, 'хвилина', 'хвилини', 'хвилин')}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {test.questionsCount} {getPlural(test.questionsCount, 'питання', 'питання', 'питань')}
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${attemptsLeft > 0 ? 'text-slate-400' : 'text-red-400'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {attemptsLeft <= 0 
            ? 'Спроб немає' 
            : `${attemptsLeft} ${getPlural(attemptsLeft, 'спроба залишилась', 'спроби залишилось', 'спроб залишилось')}`}
        </div>
      </div>

      {/* Last attempt result */}
      {test.lastAttempt && (
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-slate-400 mb-0.5">Остання спроба:</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {test.lastAttempt.score} / {test.lastAttempt.maxScore} балів
            </span>
            <span className={`text-xs font-medium ${
              test.lastAttempt.passed ? 'text-green-400' : 'text-red-400'
            }`}>
              ({test.lastAttempt.percentage}%)
              {test.lastAttempt.passed ? ' ✓' : ' ✗'}
            </span>
          </div>
        </div>
      )}

      {/* Action button */}
      {status.available ? (
        <button
          onClick={() => navigate(`/student/test/${test.id}/start`)}
          className="btn-primary w-full text-center text-sm mt-auto"
        >
          Розпочати тест →
        </button>
      ) : (
        <button
          disabled
          className="w-full px-6 py-3 rounded-xl font-semibold text-slate-500 bg-white/5 border border-white/10 cursor-not-allowed text-sm"
        >
          {test.status === 'CLOSED' || attemptsLeft <= 0 ? 'Недоступний' : 'Очікування'}
        </button>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuthStore()

  const { data: tests, isLoading, error } = useQuery<StudentTest[]>({
    queryKey: ['student-tests'],
    queryFn: async () => {
      const res = await apiClient.get('/tests')
      return res.data.data
    },
  })

  return (
    <div className="animate-fade-in">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-2">
          Вітаємо, {user?.name ? (user.name.split(' ').length > 1 ? user.name.split(' ')[1] : user.name) : 'Студент'} 👋
        </h1>
        <p className="text-slate-400">
          Ваші доступні тести та результати
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-card p-6 border-red-500/30 text-center mb-6">
          <p className="text-red-400">Помилка завантаження тестів. Спробуйте оновити сторінку.</p>
        </div>
      )}

      {/* Tests grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tests && tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-accent/10 border border-purple-accent/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-unbounded text-lg font-semibold text-white mb-2">
            Тести відсутні
          </h3>
          <p className="text-slate-400 text-sm">
            На даний момент для вашої групи немає доступних тестів.
          </p>
        </div>
      )}
    </div>
  )
}
