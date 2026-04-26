import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { useTestStore } from '../../store/testStore'
import { StudentTest } from '../../types'
 
function getPlural(n: number, one: string, few: string, many: string) {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return one;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) return few;
  return many;
}

export default function TestStart() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const { startAttempt, isLoading: isStarting } = useTestStore()
  const [startError, setStartError] = useState<string | null>(null)

  const { data: test, isLoading } = useQuery<StudentTest>({
    queryKey: ['student-test', testId],
    queryFn: async () => {
      const res = await apiClient.get(`/tests/${testId}`)
      return res.data
    },
    enabled: !!testId,
  })

  const handleStart = async () => {
    if (!testId) return
    setStartError(null)
    try {
      // FULLSCREEN ON START
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
      
      await startAttempt(testId)
      navigate(`/student/test/${testId}/take`, { replace: true })
    } catch (err: unknown) {
      const msg = getApiError(err, 'Помилка при старті тесту')
      setStartError(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Завантаження інформації про тест...</p>
        </div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto mt-20">
        <p className="text-red-400">Тест не знайдено.</p>
        <button onClick={() => navigate('/student/dashboard')} className="btn-secondary mt-4">
          Назад до дашборду
        </button>
      </div>
    )
  }

  const attemptsLeft = test.maxAttempts - test.attemptsUsed

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/student/dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 mb-6 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Назад до дашборду
      </button>

      {/* Test info card */}
      <div className="glass-card p-8 mb-5">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-accent/20 border border-purple-accent/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="font-unbounded text-2xl font-bold text-white leading-tight">{test.title}</h1>
            {test.subject && (
              <p className="text-purple-300 mt-1">{test.subject}</p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="font-unbounded text-2xl font-bold text-white">{test.questionsCount}</p>
            <p className="text-slate-400 text-xs mt-1">Питань</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="font-unbounded text-2xl font-bold text-white">{test.timeLimitMin}</p>
            <p className="text-slate-400 text-xs mt-1">Хвилин</p>
          </div>
          <div className={`text-center p-4 rounded-2xl border ${
            attemptsLeft > 0
              ? 'bg-white/5 border-white/10'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <p className={`font-unbounded text-2xl font-bold ${attemptsLeft > 0 ? 'text-white' : 'text-red-400'}`}>
              {attemptsLeft}
            </p>
            <p className="text-slate-400 text-xs mt-1">Спроб</p>
          </div>
        </div>

        {/* Threshold */}
        {test.passThreshold && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-accent/10 border border-purple-accent/20 mb-4">
            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <p className="text-purple-300 text-sm">
              Прохідний бал: <span className="font-semibold text-white">
                {test.passThreshold}{test.scoringMode === 'PERCENTAGE' ? '%' : ` ${getPlural(test.passThreshold, 'бал', 'бали', 'балів')}`}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen warning */}
      <div className="glass-card p-5 mb-5 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-yellow-400 font-semibold text-sm mb-1">Увага!</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Заборонено використання ШІ (ChatGPT, Gemini тощо)</li>
              <li>• Використання мобільних пристроїв суворо заборонено</li>
              <li>• Не перемикайте вкладки та не згортайте браузер</li>
              <li>• Після старту таймер не зупиняється</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error */}
      {startError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-5">
          <p className="text-red-400 text-sm">{startError}</p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={isStarting || attemptsLeft <= 0}
        className="w-full btn-primary py-5 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3"
      >
        {isStarting ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Підготовка тесту...
          </>
        ) : attemptsLeft <= 0 ? (
          'Спроби вичерпано'
        ) : (
          <>
            Розпочати тест
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}
