import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { getApiError } from '../../api/errors'
import { useTestStore } from '../../store/testStore'
import { StudentTest } from '../../types'
import { getAnonymousAlias } from '../../utils/aliasGenerator'
 
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

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ['leaderboard', testId],
    queryFn: async () => {
      if (!testId) return []
      const res = await apiClient.get(`/tests/${testId}/leaderboard`)
      return res.data
    },
    enabled: !!testId,
  })

  const handleStart = async () => {
    if (!testId) return

    // IMMEDIATE Fullscreen for Chrome/Mobile (must be absolute first to avoid losing user gesture)
    const el = document.documentElement as any;
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (requestFs) {
      requestFs.call(el).catch(() => {});
    }

    setStartError(null)
    try {
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
            <p className="text-yellow-400 font-semibold text-sm mb-1">Увага! Анти-чит система активована</p>
            <ul className="text-slate-300 text-xs space-y-2 list-disc pl-4">
              <li>Тест відкриється у <span className="text-white font-bold underline">повноекранному режимі</span>.</li>
              <li>Спроба виходу з повного екрану або перемикання вкладок буде <span className="text-red-400 font-semibold">зафіксована</span>.</li>
              <li>Використання <span className="text-white font-bold">ШІ (ChatGPT, Gemini тощо)</span> та сторонніх девайсів суворо заборонено.</li>
              <li>Будь-яка спроба порушення правил призведе до того, що тест буде вважатися <span className="text-red-400 font-bold uppercase underline">не складеним</span>.</li>
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

      {/* Anonymous Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="glass-card p-6 md:p-8 mt-8 relative overflow-hidden shadow-xl border-purple-accent/10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="font-unbounded text-lg font-bold text-white">Дошка лідерів (Анонімно)</h2>
              <p className="text-slate-400 text-xs mt-0.5">Найкращі результати проходження цього тесту</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {leaderboard.map((item: any, index: number) => {
              const isTop3 = index < 3
              const medalColors = ['text-yellow-400 bg-yellow-400/10 border-yellow-400/20', 'text-slate-300 bg-slate-300/10 border-slate-300/20', 'text-amber-600 bg-amber-600/10 border-amber-600/20']
              const alias = getAnonymousAlias(item.studentId)
              
              const durationMin = item.startedAt && item.finishedAt 
                ? Math.round((new Date(item.finishedAt).getTime() - new Date(item.startedAt).getTime()) / 1000 / 60)
                : null

              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01] duration-200 ${
                    isTop3 
                      ? 'bg-purple-accent/5 border-purple-accent/20' 
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                      isTop3 ? medalColors[index] : 'text-slate-400 bg-white/5 border-white/10'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{alias}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {durationMin !== null && (
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        ⏱️ {durationMin} хв
                      </span>
                    )}
                    <span className="font-unbounded text-sm font-black text-purple-accent">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
