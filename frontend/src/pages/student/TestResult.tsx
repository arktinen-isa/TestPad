import { useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useTestStore } from '../../store/testStore'
import { AttemptResult } from '../../types'
import { PASS_MESSAGES, FAIL_MESSAGES } from '../../constants/messages'
import { getAnonymousAlias } from '../../utils/aliasGenerator'

function getPlural(n: number, one: string, few: string, many: string) {
  const lastDigit = Math.floor(n) % 10;
  const lastTwoDigits = Math.floor(n) % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return one;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) return few;
  return many;
}

export default function TestResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const {
    reset,
    attemptId: storeAttemptId,
    score: storeScore,
    maxScore: storeMax,
    percentage: storePercent,
    passThreshold: storeThreshold,
    scoringMode: storeScoringMode,
    passed: storePassed,
    showResultMode: storeShowResultMode,
  } = useTestStore()

  const params = new URLSearchParams(location.search)
  const attemptId = params.get('attemptId') || location.state?.attemptId || storeAttemptId

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['attempt-result', attemptId],
    queryFn: async () => {
      if (!attemptId) return null
      const res = await apiClient.get(`/attempts/${attemptId}/result`)
      return res.data
    },
    enabled: !!attemptId,
  })

  const testId = result?.testId
  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ['leaderboard', testId],
    queryFn: async () => {
      if (!testId) return []
      const res = await apiClient.get(`/tests/${testId}/leaderboard`)
      return res.data
    },
    enabled: !!testId,
  })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['tests'] })
  }, [queryClient])

  const score = result?.score ?? storeScore
  const maxScore = result?.maxScore ?? storeMax
  const percentage = result?.percentage ?? storePercent ?? 0
  const passThreshold = result?.passThreshold ?? storeThreshold
  const scoringMode = result?.scoringMode ?? storeScoringMode
  const passed = result?.passed ?? storePassed ?? (percentage >= (passThreshold ?? 60))
  
  const showResultModeValue = result?.showResultMode || storeShowResultMode || 'ADMIN_ONLY'
  const isConfidential = showResultModeValue === 'ADMIN_ONLY' || (score === null && storeScore === null)

  const motivationalMessage = useMemo(() => {
    const list = passed ? PASS_MESSAGES : FAIL_MESSAGES
    return list[Math.floor(Math.random() * list.length)]
  }, [passed])

  const displayScore = useMemo(() => {
    if (scoringMode === 'SUM') {
      return `${score} / ${maxScore} ${getPlural(maxScore || 0, 'бал', 'бали', 'балів')}`
    }
    return `${percentage}%`
  }, [scoringMode, score, maxScore, percentage])

  const handleBackToDashboard = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['student-tests'] })
    navigate('/student/dashboard', { replace: true })
  }

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['student-tests'] })
  }, [queryClient])

  useEffect(() => {
    if (!isLoading && !result && !attemptId && storeScore === null) {
      navigate('/student/dashboard')
    }
  }, [isLoading, result, attemptId, storeScore, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Обробка результатів...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <div className="glass-card overflow-hidden shadow-2xl relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-accent/5 to-transparent pointer-events-none" />

        <div className="p-8 md:p-12 text-center relative z-10">
          <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-3">Тестування завершено</p>
          <h1 className="font-unbounded text-2xl md:text-3xl font-extrabold text-white mb-10 leading-tight">
            {result?.testTitle || 'Результати тесту'}
          </h1>

          {isConfidential ? (
            <div className="glass-card p-10 border-blue-500/20 bg-blue-500/5 backdrop-blur-xl">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/10">
                <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                </svg>
              </div>
              <h2 className="font-unbounded text-2xl font-bold text-white mb-4 tracking-tight">Роботу прийнято!</h2>
              <p className="text-blue-300 italic mb-8 max-w-sm mx-auto leading-relaxed">
                Твій викладач отримав результати та оцінить твої старання зовсім скоро. Не зупиняйся на досягнутому!
              </p>
              <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mx-auto" />
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full scale-150 animate-pulse-slow" />
                <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-2 relative z-10">Твій результат</p>
                <div className={`font-unbounded text-6xl md:text-7xl font-black mb-2 tabular-nums relative z-10 drop-shadow-2xl ${
                  passed ? 'text-green-cta' : 'text-red-400'
                }`}>
                  {displayScore}
                </div>

                <div className="flex justify-center mt-6 relative">
                  {passed && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-x-0 -top-10 flex justify-center">
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-ping opacity-50" />
                      </div>
                      <div className="absolute -left-10 top-0 w-2 h-2 bg-purple-400 rounded-full animate-bounce opacity-40 delay-100" />
                      <div className="absolute -right-10 top-5 w-2 h-2 bg-pink-400 rounded-full animate-bounce opacity-40 delay-300" />
                    </div>
                  )}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold uppercase tracking-widest transition-all duration-500 ${
                    passed
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.2)] scale-110'
                      : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-lg shadow-red-500/10'
                  }`}>
                    {passed ? (
                      <>
                        <div className="absolute inset-0 bg-green-500/20 blur-xl animate-pulse rounded-full" />
                        <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Складено
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Не складено
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V4L14.017 3H21.017V15C21.017 18.3137 18.3307 21 15.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H5.017C3.91243 8 3.017 7.10457 3.017 6V4L3.017 3H10.017V15C10.017 18.3137 7.33071 21 4.017 21H3.017Z" />
                  </svg>
                </div>
                <p className="text-xl md:text-2xl text-purple-100 font-medium leading-relaxed italic relative z-10">
                  « {motivationalMessage} »
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Anonymous Leaderboard */}
      {testId && leaderboard && leaderboard.length > 0 && (
        <div className="glass-card p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl border-purple-accent/10">
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



      <button
        onClick={handleBackToDashboard}
        className="w-full btn-primary py-5 rounded-2xl flex items-center justify-center gap-3 font-bold group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Повернутись до кабінету
      </button>
    </div>
  )
}
