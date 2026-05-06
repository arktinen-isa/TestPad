import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { StudentTest, Form } from '../../types'
import { useTestStore } from '../../store/testStore'
import { useState } from 'react'
import { generateCertificate } from '../../utils/certificateGenerator'

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
  const { user } = useAuthStore()
  const status = getTestStatusInfo(test)
  const attemptsUsed = test.attemptsUsed || 0
  const attemptsLeft = test.maxAttempts - attemptsUsed
  const activeAttemptId = test.lastAttempt && !test.lastAttempt.finishedAt ? test.lastAttempt.id : null
  const [isActionLoading, setIsActionLoading] = useState(false)
  const { resumeAttempt } = useTestStore()

  const handleAction = async () => {
    setIsActionLoading(true)
    if (activeAttemptId) {
      try {
        await resumeAttempt(activeAttemptId)
        navigate(`/student/test/${test.id}/take`)
      } catch {
        navigate(`/student/test/${test.id}/start`)
      } finally {
        setIsActionLoading(false)
      }
    } else {
      navigate(`/student/test/${test.id}/start`)
    }
  }

  const handleDownloadCertificate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!test.lastAttempt || !user) return
    
    const score = test.scoringMode === 'PERCENTAGE' 
      ? `${test.lastAttempt.percentage}%` 
      : `${test.lastAttempt.score} / ${test.lastAttempt.maxScore}`
      
    generateCertificate(
      user.name,
      test.title,
      score,
      test.lastAttempt.finishedAt || '',
      test.logoUrl
    )
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-4 hover:border-purple-accent/30 transition-all duration-300 group">
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

      {(test.openFrom || test.openUntil) && (
        <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 border-dashed">
          {test.openFrom && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">Відкриття:</span>
              <span className="text-slate-300 font-medium">
                {new Date(test.openFrom).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {test.openUntil && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 uppercase tracking-wider font-semibold">Дедлайн:</span>
              <span className="text-slate-300 font-medium">
                {new Date(test.openUntil).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}

      {test.lastAttempt?.finishedAt && test.showResultMode !== 'ADMIN_ONLY' && (
        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group/result">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Остання спроба:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {test.scoringMode === 'PERCENTAGE'
                  ? `${test.lastAttempt.percentage ?? 0}%`
                  : `${test.lastAttempt.score ?? 0} / ${test.lastAttempt.maxScore ?? 0} балів`}
              </span>
              <span className={`text-xs font-medium ${
                test.lastAttempt.passed ? 'text-green-400' : 'text-red-400'
              }`}>
                {test.lastAttempt.passed ? ' (Складено ✓)' : ' (Не складено ✗)'}
              </span>
            </div>
          </div>

          {test.allowCertificate && test.lastAttempt.passed && (
            <button
              onClick={handleDownloadCertificate}
              className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300"
              title="Завантажити сертифікат"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {test.logoUrl && (
        <div className="absolute top-4 right-4 w-12 h-12 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
          <img 
            src={test.logoUrl} 
            alt="" 
            className="w-full h-full object-contain filter grayscale" 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}

      {status.available || activeAttemptId ? (
        <button
          onClick={handleAction}
          disabled={isActionLoading}
          className={`w-full text-center text-sm mt-auto px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeAttemptId
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : 'btn-primary'
          }`}
        >
          {isActionLoading && (
            <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {activeAttemptId ? 'Продовжити тест →' : 'Розпочати тест →'}
        </button>
      ) : (
        <button
          disabled
          className="w-full px-6 py-3 rounded-xl font-semibold text-slate-500 bg-white/5 border border-white/10 cursor-not-allowed text-sm"
        >
          {test.status === 'CLOSED' ? 'Тест закрито' : (test.maxAttempts - (test.attemptsUsed || 0) <= 0 ? 'Спроб немає' : 'Очікування')}
        </button>
      )}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'tests' | 'forms'>('tests')

  const { data: tests, isLoading, error } = useQuery<StudentTest[]>({
    queryKey: ['student-tests'],
    queryFn: async () => {
      const res = await apiClient.get('/tests')
      return res.data.data
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })

  const { data: forms, isLoading: isFormsLoading } = useQuery<Form[]>({
    queryKey: ['student-forms'],
    queryFn: async () => {
      const res = await apiClient.get('/forms')
      return res.data
    },
    staleTime: 1000 * 60,
  })

  return (
    <div className="animate-fade-in text-left">
      <div className="mb-8">
        <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-2">
          Вітаємо, {user?.name ? (user.name.split(' ').length > 1 ? user.name.split(' ')[1] : user.name) : 'Студент'} 👋
        </h1>
        <p className="text-slate-400">
          Ваш персональний кабінет для проходження тестів та опитувань
        </p>
      </div>

      {error && (
        <div className="glass-card p-6 border-red-500/30 text-center mb-6">
          <p className="text-red-400">Помилка завантаження тестів. Спробуйте оновити сторінку.</p>
        </div>
      )}

      <div className="w-full space-y-6">
        <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'tests'
                ? 'bg-purple-accent text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📝 Тести ({tests?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'forms'
                ? 'bg-purple-accent text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📋 Опитування ({forms?.length || 0})
          </button>
        </div>

        {activeTab === 'tests' && (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : tests && tests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          )
        )}

        {activeTab === 'forms' && (
          isFormsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : forms && forms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {forms.map((form) => {
                const isSubmitted = form.submissions && form.submissions.length > 0;
                return (
                  <div key={form.id} className="glass-card p-6 flex flex-col justify-between hover:border-purple-accent/30 transition-all duration-300 group">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-accent/15 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                            {form._count?.fields || 0} питань
                          </span>
                          {form.openUntil && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                              🕒 До: {new Date(form.openUntil).toLocaleDateString('uk-UA')}
                            </span>
                          )}
                        </div>
                        <span className={`status-badge ${isSubmitted ? 'status-open' : 'status-draft'}`}>
                          {isSubmitted ? 'Заповнено ✓' : 'Не заповнено'}
                        </span>
                      </div>
                      <h3 className="font-unbounded text-base font-bold text-white group-hover:text-purple-300 transition-colors duration-200 mb-2 leading-snug">
                        {form.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-6 line-clamp-2">{form.description || 'Опис відсутній'}</p>
                    </div>
                    <button 
                      onClick={() => navigate(`/student/forms/${form.id}`)}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 text-center ${
                        isSubmitted 
                          ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300' 
                          : 'btn-primary'
                      }`}
                    >
                      {isSubmitted ? 'Редагувати відповідь' : 'Пройти опитування'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-accent/10 border border-purple-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-unbounded text-lg font-semibold text-white mb-2">Опитування відсутні</h3>
              <p className="text-slate-400 text-sm">На даний момент для вас немає активних опитувань.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
