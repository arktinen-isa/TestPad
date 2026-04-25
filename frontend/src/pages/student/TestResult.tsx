import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useTestStore } from '../../store/testStore'
import { AttemptResult } from '../../types'
import { PASS_MESSAGES, FAIL_MESSAGES } from '../../constants/messages'

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
  const { reset, score: storeScore, maxScore: storeMax, percentage: storePercent, passThreshold: storeThreshold } = useTestStore()

  // Try to get attemptId from query params or state
  const params = new URLSearchParams(location.search)
  const attemptId = params.get('attemptId') || location.state?.attemptId

  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['attempt-result', attemptId],
    queryFn: async () => {
      if (!attemptId) return null
      const res = await apiClient.get(`/attempts/${attemptId}/result`)
      return res.data
    },
    enabled: !!attemptId,
  })

  const queryClient = useQueryClient()

  const handleBackToDashboard = () => {
    reset()
    // Invalidate dashboard queries to refresh test cards (attempts, etc)
    queryClient.invalidateQueries({ queryKey: ['student-tests'] })
    navigate('/student/dashboard', { replace: true })
  }

  // Use store values as fallback
  const score = result?.score ?? storeScore
  const maxScore = result?.maxScore ?? storeMax
  const percentage = result?.percentage ?? storePercent ?? 0
  const passed = result?.passed
  const timeSpent = result?.timeSpentSec
  const passThreshold = result?.passThreshold ?? storeThreshold

  const isPassed = passed ?? (percentage >= (passThreshold ?? 60));
  const randomMessage = useMemo(() => {
    const messages = isPassed ? PASS_MESSAGES : FAIL_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
  }, [isPassed]);

  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-cta'
    if (percentage >= 70) return 'text-green-400'
    if (percentage >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getCircleColor = () => {
    if (percentage >= 90) return '#00ff87'
    if (percentage >= 70) return '#4ade80'
  const testTitle = result?.testTitle

  const scoringMode = result?.scoringMode || storeScoringMode
  
  const displayScore = useMemo(() => {
    if (scoringMode === 'POINTS') {
      return `${score} / ${maxScore}`
    }
    return `${percentage}%`
  }, [scoringMode, score, maxScore, percentage])

  const scoreLabel = useMemo(() => {
    return scoringMode === 'POINTS' ? 'Набрано балів' : 'Результат'
  }, [scoringMode])

  useEffect(() => {
    if (!isLoading && !result && !attemptId) {
      navigate('/student/dashboard')
    }
  }, [isLoading, result, attemptId, navigate])

  const motivationalMessage = useMemo(() => {
    const list = (passed ?? (percentage >= (passThreshold ?? 60))) ? PASS_MESSAGES : FAIL_MESSAGES
    return list[Math.floor(Math.random() * list.length)]
  }, [passed, percentage, passThreshold])

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
            </div>
          </div>
        ) : (
          <>
            {/* Circular progress */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <svg width="160" height="160" className="-rotate-90">
                  <circle
                    cx="80" cy="80" r={radius}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80" cy="80" r={radius}
                    stroke={getCircleColor()}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={hasAnimated ? strokeDashoffset : circumference}
                    style={{
                      transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: `drop-shadow(0 0 8px ${getCircleColor()}80)`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`font-unbounded text-3xl font-bold ${getScoreColor()}`}>
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Score info */}
            <div className="text-center">
              {score !== null && maxScore !== null && (
                <p className="font-unbounded text-2xl font-bold text-white mb-1">
                  {score} / {maxScore} балів
                </p>
              )}
              
              {passed !== undefined && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mt-4 ${
                  passed
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {passed ? 'Зараховано' : 'Не зараховано'}
                </div>
              )}

              {/* Motivational Joke */}
              <div className="mt-6 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-slate-300 text-sm italic leading-relaxed">
                  « {randomMessage} »
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {timeSpent !== undefined && (
          <div className="glass-card p-4 text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Витрачено часу</p>
            <p className="text-white font-semibold text-sm">{formatDuration(timeSpent)}</p>
          </div>
        )}
        {result?.finishReason && result.finishReason !== 'NORMAL' && (
          <div className="glass-card p-4 text-center border-orange-500/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Завершення</p>
            <p className="text-orange-400 font-semibold text-[11px]">
              {result.finishReason === 'TIMEOUT' ? 'Вичерпано час' : 'Достроково'}
            </p>
          </div>
        )}
      </div>

      {/* Footer action */}
      <button
        onClick={handleBackToDashboard}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 font-bold"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Повернутись до кабінету
      </button>
    </div>
  )
}
