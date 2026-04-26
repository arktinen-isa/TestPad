import { useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useTestStore } from '../../store/testStore'
import { AttemptResult } from '../../types'
import { PASS_MESSAGES, FAIL_MESSAGES } from '../../constants/messages'
 
function getPlural(n: number, one: string, few: string, many: string) {
  const lastDigit = Math.floor(n) % 10;
  const lastTwoDigits = Math.floor(n) % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return one;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) return few;
  return many;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} сек`
  return `${m} хв ${s} сек`
}

export default function TestResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const {
    reset,
    score: storeScore,
    maxScore: storeMax,
    percentage: storePercent,
    passThreshold: storeThreshold,
    scoringMode: storeScoringMode,
    passed: storePassed,
    showResultMode: storeShowResultMode
  } = useTestStore()

  // Try to get attemptId from query params or state
  const params = new URLSearchParams(location.search)
  const attemptId = params.get('attemptId') || location.state?.attemptId

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['attempt-result', attemptId],
    queryFn: async () => {
      if (!attemptId) return null
      const res = await apiClient.get(`/attempts/${attemptId}/result`)
      return res.data
    },
    enabled: !!attemptId,
  })

  // Use store values as fallback
  const score = result?.score ?? storeScore
  const maxScore = result?.maxScore ?? storeMax
  const percentage = result?.percentage ?? storePercent ?? 0
  const passThreshold = result?.passThreshold ?? storeThreshold
  const scoringMode = result?.scoringMode ?? storeScoringMode
  const passed = result?.passed ?? storePassed ?? (percentage >= (passThreshold ?? 60))
  const showResultMode = result?.showResultMode || storeShowResultMode || 'ADMIN_ONLY'
  const isConfidential = showResultMode === 'ADMIN_ONLY' || (score === null && storeScore === null)

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
    reset()
    queryClient.invalidateQueries({ queryKey: ['student-tests'] })
    navigate('/student/dashboard', { replace: true })
  }

  useEffect(() => {
    // Invalidate dashboard tests query as soon as we arrive at results
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
              <h2 className="font-unbounded text-2xl font-bold text-white mb-4 tracking-tight">Результати зараз на шляху до викладача!</h2>
              <p className="text-blue-300 italic mb-8 max-w-sm mx-auto leading-relaxed">
                Він оцінить твої старання та зовсім скоро повідомить підсумковий результат. Не зупиняйся на досягнутому!
              </p>
              <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mx-auto" />
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full scale-150 animate-pulse-slow" />
                <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-2 relative z-10">Твій результат</p>
                <div className={`font-unbounded text-6xl md:text-7xl font-black mb-2 tabular-nums relative z-10 drop-shadow-2xl ${passed ? 'text-green-cta' : 'text-red-400'
                  }`}>
                  {displayScore}
                </div>

                <div className="flex justify-center mt-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold uppercase tracking-widest transition-all duration-500 ${passed
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-lg shadow-green-500/10'
                      : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-lg shadow-red-500/10'
                    }`}>
                    {passed ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-6 flex items-center justify-between group hover:bg-white/5 transition-colors duration-300">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Витрачено часу</p>
            <p className="text-white font-unbounded text-xl font-bold">{formatDuration(result?.timeSpentSec || 0)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-purple-400 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between group hover:bg-white/5 transition-colors duration-300">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Завершено</p>
            <p className={`font-unbounded text-lg font-bold ${result?.finishReason === 'NORMAL' ? 'text-green-400' : 'text-orange-400'
              }`}>
              {result?.finishReason === 'TIMEOUT' ? 'Вичерпано час' :
                result?.finishReason === 'EXIT' ? 'Примусово' : 'Успішно'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-purple-400 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

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
