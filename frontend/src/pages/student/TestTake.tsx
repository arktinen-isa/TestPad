import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTestStore } from '../../store/testStore'
import apiClient from '../../api/client'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TestTake() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()

  const {
    attemptId,
    currentQuestion,
    timeLeft,
    isFinished,
    isLoading,
    submitAnswer,
    finishAttempt,
    tick,
    reset,
  } = useTestStore()

  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [showExitModal, setShowExitModal] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const attemptIdRef = useRef(attemptId)
  attemptIdRef.current = attemptId

  // If no attemptId, redirect to start
  useEffect(() => {
    if (!attemptId && !isFinished) {
      navigate(`/student/test/${testId}/start`, { replace: true })
    }
  }, [attemptId, isFinished, testId, navigate])

  // Timer countdown
  useEffect(() => {
    if (isFinished || !attemptId) return
    const interval = setInterval(() => {
      tick()
    }, 1000)
    return () => clearInterval(interval)
  }, [tick, isFinished, attemptId])

  // Auto-finish when time runs out
  useEffect(() => {
    if (timeLeft === 0 && attemptId && !isFinished) {
      handleFinish(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // Navigate when finished
  useEffect(() => {
    if (isFinished && testId) {
      navigate(`/student/test/${testId}/result`, { replace: true })
    }
  }, [isFinished, testId, navigate])

  // Fullscreen management
  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement && !isFinished) {
      setShowExitModal(true)
    }
  }, [isFinished])

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [handleFullscreenChange])

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptIdRef.current) {
        apiClient.post('/events', {
          attemptId: attemptIdRef.current,
          eventType: 'TAB_SWITCH',
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleFinish = async (auto = false) => {
    if (!attemptIdRef.current || isSubmitting) return
    setIsSubmitting(true)
    try {
      await finishAttempt(attemptIdRef.current)
    } catch {
      // Navigate anyway
      if (testId) {
        navigate(`/student/test/${testId}/result`, { replace: true })
      }
    } finally {
      setIsSubmitting(false)
      if (auto) reset()
      // Exit fullscreen on finish
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }

  const handleReturnToFullscreen = async () => {
    setShowExitModal(false)
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // ignore
    }
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)
    await handleFinish()
  }

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion) return
    if (currentQuestion.type === 'SINGLE') {
      setSelectedAnswers([answerId])
    } else {
      setSelectedAnswers((prev) =>
        prev.includes(answerId)
          ? prev.filter((id) => id !== answerId)
          : [...prev, answerId]
      )
    }
  }

  const handleNext = async () => {
    if (!attemptId || !currentQuestion || selectedAnswers.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      await submitAnswer(attemptId, currentQuestion.id, selectedAnswers)
      setSelectedAnswers([])
      setAnimKey((k) => k + 1)
    } catch {
      // error handled in store
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate time percentage
  const totalTime = currentQuestion ? timeLeft : 0
  const isTimeLow = currentQuestion && timeLeft > 0
    ? timeLeft / (timeLeft + 1) < 0.2 || timeLeft < 60
    : false

  if (!currentQuestion && !isFinished) {
    return (
      <div className="fixed inset-0 bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Завантаження питання...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-dark-bg flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-white/10 bg-dark-bg/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Test title */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs mb-0.5">Тест</p>
            <p className="text-white font-semibold text-sm truncate">
              {currentQuestion?.total ? `${currentQuestion.questionNumber} / ${currentQuestion.total}` : ''}
            </p>
          </div>

          {/* Timer */}
          <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border ${
            isTimeLow
              ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
              : 'bg-white/5 border-white/10 text-white'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-unbounded text-lg font-bold tabular-nums">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Progress */}
          <div className="flex-1 text-right min-w-0">
            <p className="text-slate-400 text-xs mb-0.5">Прогрес</p>
            <p className="text-white font-semibold text-sm">
              {currentQuestion
                ? `Питання ${currentQuestion.questionNumber} з ${currentQuestion.total}`
                : ''}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {currentQuestion && (
          <div className="max-w-4xl mx-auto mt-3">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-accent to-pink-accent rounded-full transition-all duration-500"
                style={{
                  width: `${(currentQuestion.questionNumber / currentQuestion.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {currentQuestion && (
            <div key={animKey} className="animate-slide-in">
              {/* Question number & type */}
              <div className="flex items-center gap-3 mb-5">
                <span className="px-3 py-1 rounded-full bg-purple-accent/20 border border-purple-accent/30 text-purple-300 text-xs font-semibold">
                  Питання {currentQuestion.questionNumber}
                </span>
                <span className="text-slate-500 text-xs">
                  {currentQuestion.type === 'SINGLE'
                    ? 'Одна правильна відповідь'
                    : 'Кілька правильних відповідей'}
                </span>
              </div>

              {/* Question text */}
              <h2 className="font-inter text-xl font-semibold text-white mb-8 leading-relaxed">
                {currentQuestion.text}
              </h2>

              {/* Answers */}
              <div className="space-y-3">
                {currentQuestion.answers.map((answer) => {
                  const isSelected = selectedAnswers.includes(answer.id)
                  return (
                    <button
                      key={answer.id}
                      onClick={() => handleSelectAnswer(answer.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-purple-accent/20 border-purple-accent/60 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      {/* Indicator */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-accent bg-purple-accent'
                          : 'border-white/30 group-hover:border-white/50'
                      }`}>
                        {isSelected && currentQuestion.type === 'SINGLE' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                        {isSelected && currentQuestion.type === 'MULTI' && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-base font-medium transition-colors duration-200 ${
                        isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {answer.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-white/10 bg-dark-bg/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all duration-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Завершити
          </button>

          <button
            onClick={handleNext}
            disabled={selectedAnswers.length === 0 || isSubmitting || isLoading}
            className="btn-primary px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Збереження...
              </>
            ) : (
              <>
                {currentQuestion && currentQuestion.questionNumber < currentQuestion.total
                  ? 'Далі'
                  : 'Завершити тест'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div className="modal-overlay">
          <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-unbounded text-xl font-bold text-white mb-3">
              Завершити тест?
            </h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Ви намагаєтесь вийти з тесту. Тест буде завершено та оцінено.
              Решта питань вважатиметься без відповіді. Підтвердити?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReturnToFullscreen}
                className="flex-1 btn-secondary"
              >
                Повернутись до тесту
              </button>
              <button
                onClick={handleConfirmExit}
                disabled={isSubmitting}
                className="flex-1 btn-danger disabled:opacity-50"
              >
                {isSubmitting ? 'Збереження...' : 'Завершити та здати'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unused variable suppression */}
      {totalTime > 0 && <></>}
    </div>
  )
}
