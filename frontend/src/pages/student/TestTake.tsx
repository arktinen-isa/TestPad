import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTestStore } from '../../store/testStore'
import apiClient from '../../api/client'
import QuestionText from '../../components/QuestionText'

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
  } = useTestStore()

  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [showExitModal, setShowExitModal] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullScreen(isFs)
      if (!isFs && !isFinished && attemptId) {
        apiClient.post('/events', { attemptId, eventType: 'WINDOW_RESIZE' }).catch(() => {})
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
    }
  }, [attemptId, isFinished, logSuspiciousEvent])

  const enterFullscreen = () => {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen()
    }
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const attemptIdRef = useRef(attemptId)
  attemptIdRef.current = attemptId
  const isTimeLow = timeLeft !== null && timeLeft > 0 && timeLeft < 120

  const handleFinish = useCallback(async () => {
    if (!attemptIdRef.current || isSubmitting) return
    setIsSubmitting(true)
    try {
      await finishAttempt(attemptIdRef.current)
    } catch {
      if (testId) {
        navigate(`/student/test/${testId}/result`, {
          replace: true,
          state: { attemptId: attemptIdRef.current },
        })
      }
    } finally {
      setIsSubmitting(false)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [testId, navigate, finishAttempt, isSubmitting])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptIdRef.current) {
        apiClient.post('/events', {
          attemptId: attemptIdRef.current,
          eventType: 'TAB_SWITCH',
        }).catch(() => {})
      }
    }
    const handleBlur = () => {
      if (attemptIdRef.current) {
        apiClient.post('/events', {
          attemptId: attemptIdRef.current,
          eventType: 'WINDOW_BLUR',
        }).catch(() => {})
      }
    }
    const handleResize = () => {
      if (attemptIdRef.current && !document.fullscreenElement) {
        apiClient.post('/events', {
          attemptId: attemptIdRef.current,
          eventType: 'WINDOW_RESIZE',
        }).catch(() => {})
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, F12, PrintScreen etc.
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      if (isCtrlOrMeta && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'u')) {
        e.preventDefault()
      }
      if (e.key === 'F12' || (isCtrlOrMeta && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        apiClient.post('/events', {
          attemptId: attemptIdRef.current,
          eventType: 'SCREENSHOT_ATTEMPT',
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!attemptId && !isFinished) {
      navigate(`/student/test/${testId}/start`, { replace: true })
    }
  }, [attemptId, isFinished, testId, navigate])

  useEffect(() => {
    if (isFinished || !attemptId) return
    const interval = setInterval(() => { tick() }, 1000)
    return () => clearInterval(interval)
  }, [tick, isFinished, attemptId])

  useEffect(() => {
    if (timeLeft === 0 && attemptId && !isFinished) {
      handleFinish()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  useEffect(() => {
    if (isFinished && testId) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      navigate(`/student/test/${testId}/result`, {
        replace: true,
        state: { attemptId: attemptIdRef.current },
      })
    }
  }, [isFinished, testId, navigate])

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
        prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
      )
    }
  }

  const handleNext = async () => {
    if (!attemptId || !currentQuestion || isSubmitting) return
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

  if (!currentQuestion && !isFinished) {
    return (
      <div className="fixed inset-0 bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="w-10 h-10 border-2 border-purple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Завантаження питання...</p>
            </>
          ) : (
            <>
              <p className="text-red-400 mb-4">Помилка завантаження питання</p>
              <button
                onClick={() => navigate(`/student/test/${testId}/start`, { replace: true })}
                className="btn-secondary"
              >
                Повернутись на початок
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0F0A1E] text-white flex flex-col z-[1000] overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3B2A6B_0%,#0F0A1E_80%)] opacity-60 pointer-events-none" />
      
      {!isFullScreen && !isFinished && (
        <div className="fixed inset-0 z-[9999] bg-[#0F0A1E]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 ring-8 ring-red-500/20 animate-pulse">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black font-unbounded text-white mb-4 tracking-tighter">ПОВНОЕКРАННИЙ РЕЖИМ ПОРУШЕНО</h2>
          <p className="text-slate-400 max-w-sm mb-10 text-lg leading-relaxed">
            Для продовження тестування необхідно повернутися у повноекранний режим. Це правило безпеки було активоване автоматично.
          </p>
          <button 
            onClick={enterFullscreen} 
            className="btn-secondary px-12 py-5 text-xl shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:shadow-[0_0_70px_rgba(124,58,237,0.6)] active:scale-95 transition-all"
          >
            Повернутись у тест
          </button>
          <p className="text-white/20 text-[10px] mt-12 uppercase tracking-widest">GradeX Security Protocol v2.4</p>
        </div>
      )}
      
      {/* Header / Progress Bar */}
      <div className="flex-shrink-0 bg-[#160D33]/60 backdrop-blur-3xl border-b border-white/5 px-6 py-4 shadow-2xl relative z-[1001]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Виконується тест</p>
            <h1 className="text-white font-unbounded text-sm font-bold truncate tracking-tight">
              {currentQuestion?.total ? `Питання ${currentQuestion.questionNumber} з ${currentQuestion.total}` : 'Завантаження...'}
            </h1>
          </div>

          <div className="flex-shrink-0">
            {timeLeft !== null ? (
              <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex items-center gap-3 ${
                isTimeLow 
                  ? 'bg-red-500/20 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                  : 'bg-white/5 border-white/10 text-white shadow-xl'
              }`}>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Час залишився</span>
                  <span className="font-unbounded text-xl font-black tabular-nums tracking-tighter leading-none">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTimeLow ? 'bg-red-500/20' : 'bg-purple-500/20'}`}>
                  <svg className={`w-5 h-5 ${isTimeLow ? 'animate-pulse text-red-400' : 'text-purple-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl border bg-white/5 border-white/10 text-white/40 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest">Без ліміту</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Progress Line */}
        {currentQuestion && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              style={{ width: `${(currentQuestion.questionNumber / currentQuestion.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-[1001]">
        {isLoading ? (
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-12 animate-pulse">
            <div className="space-y-4">
              <div className="h-4 w-32 bg-white/5 rounded-full" />
              <div className="h-10 w-full bg-white/5 rounded-2xl" />
              <div className="h-8 w-3/4 bg-white/5 rounded-2xl" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 w-full bg-white/5 rounded-3xl" />
              ))}
            </div>
          </div>
        ) : !currentQuestion && !isFinished ? (
          <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
             <div className="glass-card p-10 max-w-md w-full border-red-500/20 bg-red-500/5">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="font-unbounded text-2xl font-bold text-white mb-4">Помилка завантаження</h2>
                <p className="text-slate-400 mb-8 leading-relaxed">Питань для цього тесту не знайдено. Будь ласка, зверніться до викладача.</p>
                <button onClick={() => navigate('/student/dashboard')} className="w-full btn-ghost py-4">До кабінету</button>
             </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-12 pb-32">
            {currentQuestion && (
              <div key={animKey} className="animate-fade-in-up">
                <div className="flex items-center gap-4 mb-8">
                  <div className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    Питання {currentQuestion.questionNumber}
                  </div>
                  <div className="h-px flex-1 bg-white/5" />
                  <div className="text-white/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-pulse" />
                    {currentQuestion.type === 'SINGLE' ? 'Оберіть одну відповідь' : 'Оберіть кілька відповідей'}
                  </div>
                </div>

              {currentQuestion.imageUrl && (
                <div className="mb-6">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Зображення до питання"
                    className="max-w-full max-h-64 rounded-2xl border border-white/10 object-contain"
                  />
                </div>
              )}

              <QuestionText
                text={currentQuestion.text}
                className="text-xl font-semibold text-white mb-8 leading-relaxed"
              />

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
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected ? 'border-purple-accent bg-purple-accent' : 'border-white/30 group-hover:border-white/50'
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
      )}
    </div>

      <div className="flex-shrink-0 border-t border-white/5 bg-[#0D071F]/90 backdrop-blur-2xl px-6 py-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl text-white/40 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Завершити
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting || isLoading || !selectedAnswers.length}
            className="group relative px-10 py-3.5 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white font-unbounded font-black text-sm uppercase tracking-widest shadow-[0_10px_30px_rgba(52,211,153,0.3)] hover:shadow-[0_10px_40px_rgba(52,211,153,0.5)] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 relative z-10">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Завантаження...</span>
                </>
              ) : (
                <>
                  <span>
                    {currentQuestion && currentQuestion.questionNumber < currentQuestion.total 
                      ? 'Наступне питання' 
                      : 'Фініш'}
                  </span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

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
              Завершити тестування?
            </h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Ви намагаєтесь вийти. Тест буде завершено та оцінено.
              Решта питань вважатиметься без відповіді. Підтвердити?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={enterFullscreen} className="flex-1 btn-secondary">
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
    </div>
  )
}
