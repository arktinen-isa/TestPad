import { useState, useEffect, useRef } from 'react'
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

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error' | 'blocked'

export default function TestStart() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const { startAttempt, isLoading: isStarting } = useTestStore()
  const [startError, setStartError] = useState<string | null>(null)

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { data: test, isLoading } = useQuery<StudentTest>({
    queryKey: ['student-test', testId],
    queryFn: async () => {
      const res = await apiClient.get(`/tests/${testId}`)
      return res.data
    },
    enabled: !!testId,
  })

  // Initialize camera if test requires webcam
  useEffect(() => {
    if (!test?.requireWebcam) return

    setCameraStatus('requesting')
    let cancelled = false

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraStatus('ready')
        setCameraError(null)
      })
      .catch(err => {
        if (cancelled) return
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus('blocked')
          setCameraError('Доступ до камери заблоковано. Дозвольте доступ до камери в налаштуваннях браузера.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraStatus('error')
          setCameraError('Камера не знайдена. Підключіть веб-камеру та спробуйте ще раз.')
        } else if (err.name === 'NotReadableError') {
          setCameraStatus('error')
          setCameraError('Камера зайнята іншою програмою. Закрийте інші вкладки або програми, що використовують камеру.')
        } else {
          setCameraStatus('error')
          setCameraError('Не вдалося отримати доступ до камери. Перевірте підключення.')
        }
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [test?.requireWebcam])

  const retryCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraStatus('requesting')
    setCameraError(null)

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraStatus('ready')
        setCameraError(null)
      })
      .catch(err => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus('blocked')
          setCameraError('Доступ до камери заблоковано. Дозвольте доступ до камери в налаштуваннях браузера.')
        } else {
          setCameraStatus('error')
          setCameraError('Не вдалося отримати доступ до камери.')
        }
      })
  }

  const handleStart = async () => {
    if (!testId) return
    if (test?.requireWebcam && cameraStatus !== 'ready') return

    // Stop camera stream - will be re-initialized in TestTake
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    // IMMEDIATE Fullscreen for Chrome/Mobile (must be absolute first to avoid losing user gesture)
    const el = document.documentElement as any;
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (requestFs) {
      requestFs.call(el).catch(() => {});
    }

    setStartError(null)
    try {
      await startAttempt(testId)
      navigate(`/student/test/${testId}/take`, {
        replace: true,
        state: { requireWebcam: test?.requireWebcam ?? false },
      })
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
  const canStart = attemptsLeft > 0 && (!test.requireWebcam || cameraStatus === 'ready')

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

      {/* Webcam check block */}
      {test.requireWebcam && (
        <div className={`glass-card p-5 mb-5 border transition-colors ${
          cameraStatus === 'ready'
            ? 'border-cyan-500/30 bg-cyan-500/5'
            : cameraStatus === 'error' || cameraStatus === 'blocked'
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-white/10'
        }`}>
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
              cameraStatus === 'ready' ? 'bg-cyan-500/20' : cameraStatus === 'error' || cameraStatus === 'blocked' ? 'bg-red-500/20' : 'bg-white/10'
            }`}>
              <svg className={`w-4 h-4 ${cameraStatus === 'ready' ? 'text-cyan-400' : cameraStatus === 'error' || cameraStatus === 'blocked' ? 'text-red-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${
                cameraStatus === 'ready' ? 'text-cyan-300' : cameraStatus === 'error' || cameraStatus === 'blocked' ? 'text-red-400' : 'text-white'
              }`}>
                {cameraStatus === 'idle' && 'Перевірка вебкамери...'}
                {cameraStatus === 'requesting' && 'Запит доступу до камери...'}
                {cameraStatus === 'ready' && 'Камера підключена та готова'}
                {cameraStatus === 'error' && 'Помилка доступу до камери'}
                {cameraStatus === 'blocked' && 'Доступ до камери заблоковано'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {cameraStatus === 'ready'
                  ? 'Система зафіксує 3 фото під час тесту для контролю академічної доброчесності'
                  : cameraError || 'Цей тест вимагає активну вебкамеру для проходження'}
              </p>
            </div>
          </div>

          {/* Camera preview */}
          <div className={`relative rounded-2xl overflow-hidden bg-black/50 border ${
            cameraStatus === 'ready' ? 'border-cyan-500/30' : 'border-white/10'
          }`} style={{ aspectRatio: '4/3', maxHeight: 240 }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />
            {cameraStatus !== 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {cameraStatus === 'requesting' || cameraStatus === 'idle' ? (
                  <div className="w-8 h-8 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
                ) : (
                  <svg className="w-10 h-10 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
                <p className="text-slate-500 text-xs">
                  {cameraStatus === 'requesting' ? 'Очікування дозволу...' : 'Камера недоступна'}
                </p>
              </div>
            )}
            {cameraStatus === 'ready' && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-[10px] font-bold uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>

          {(cameraStatus === 'error' || cameraStatus === 'blocked') && (
            <button
              onClick={retryCamera}
              className="mt-3 w-full py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Спробувати ще раз
            </button>
          )}
        </div>
      )}

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
              {test.requireWebcam && (
                <li>Вебкамера буде <span className="text-cyan-400 font-bold">активна протягом всього тесту</span>. Система зробить 3 фото у випадкові моменти та виявлятиме використання телефону.</li>
              )}
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
        disabled={isStarting || !canStart}
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
        ) : test.requireWebcam && cameraStatus !== 'ready' ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Очікування камери...
          </>
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
