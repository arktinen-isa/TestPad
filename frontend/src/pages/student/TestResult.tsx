import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useTestStore } from '../../store/testStore'
import { AttemptResult } from '../../types'

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} сек`
  return `${m} хв ${s} сек`
}

export default function TestResult() {
  const { testId: _testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { reset, score: storeScore, maxScore: storeMax, percentage: storePercent } = useTestStore()

  // Try to get attemptId from query params or state
  const params = new URLSearchParams(location.search)
  const attemptId = params.get('attemptId')

  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['attempt-result', attemptId],
    queryFn: async () => {
      const res = await apiClient.get(`/attempts/${attemptId}/result`)
      return res.data
    },
    enabled: !!attemptId,
  })

  const handleBackToDashboard = () => {
    reset()
    navigate('/student/dashboard', { replace: true })
  }

  // Use store values as fallback
  const score = result?.score ?? storeScore
  const maxScore = result?.maxScore ?? storeMax
  const percentage = result?.percentage ?? storePercent ?? 0
  const passed = result?.passed
  const timeSpent = result?.timeSpentSec

  const getScoreColor = () => {
    if (percentage >= 90) return 'text-green-cta'
    if (percentage >= 70) return 'text-green-400'
    if (percentage >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getCircleColor = () => {
    if (percentage >= 90) return '#00ff87'
    if (percentage >= 70) return '#4ade80'
    if (percentage >= 50) return '#facc15'
    return '#f87171'
  }

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Завантаження результатів...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-unbounded text-2xl font-bold text-white mb-2">
          Результати тесту
        </h1>
        {result?.testTitle && (
          <p className="text-slate-400">{result.testTitle}</p>
        )}
      </div>

      {/* Main result card */}
      <div className="glass-card p-8 mb-5">
        {/* Circular progress */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <svg width="160" height="160" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="80" cy="80" r={radius}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="12"
                fill="none"
              />
              {/* Progress circle */}
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
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-unbounded text-3xl font-bold ${getScoreColor()}`}>
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Score display */}
        <div className="text-center mb-6">
          {score !== null && maxScore !== null && (
            <p className="font-unbounded text-2xl font-bold text-white mb-1">
              {score} / {maxScore} балів
            </p>
          )}

          {/* Status */}
          {passed !== undefined && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mt-2 ${
              passed
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {passed ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Зараховано
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Не зараховано
                </>
              )}
            </div>
            {passThreshold !== undefined && scoringMode && (
              <p className="mt-2 text-xs text-slate-500">
                Прохідний поріг: {passThreshold}{scoringMode === 'PERCENTAGE' ? '%' : ' балів'}
              </p>
            )}
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {score !== null && maxScore !== null && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="font-unbounded text-xl font-bold text-white">{score}</p>
              <p className="text-slate-400 text-xs mt-1">Набраних балів</p>
            </div>
          )}
          {timeSpent !== undefined && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="font-unbounded text-base font-bold text-white">{formatDuration(timeSpent)}</p>
              <p className="text-slate-400 text-xs mt-1">Витрачено часу</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleBackToDashboard}
          className="flex-1 btn-primary py-4 text-center flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Повернутись до дашборду
        </button>
      </div>

      {/* Encouragement message */}
      {passed === false && (
        <div className="glass-card p-4 mt-4 border-yellow-500/20">
          <p className="text-yellow-400 text-sm text-center">
            Не засмучуйтесь! Спробуйте ще раз і ви обов'язково впораєтесь.
          </p>
        </div>
      )}
      {passed === true && (
        <div className="glass-card p-4 mt-4 border-green-500/20">
          <p className="text-green-400 text-sm text-center">
            Вітаємо з успішним проходженням тесту!
          </p>
        </div>
      )}
    </div>
  )
}
