import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import Logo from '../components/Logo'

const SLOGANS = [
  { e: '😅', t: 'Тест не кусається. Майже.' },
  { e: '🧠', t: 'Час довести, що ти не просто красивий.' },
  { e: '☕', t: 'Кава не допоможе. Але спробуй.' },
  { e: '🎯', t: 'Шпаргалка вже не потрібна — є ти.' },
  { e: '🚀', t: 'Викладач не дивиться. Але алгоритм — так.' },
  { e: '😎', t: 'Хтось же має бути найрозумнішим у групі.' },
  { e: '🤞', t: 'Удача — це теж стратегія. Погана, але стратегія.' },
  { e: '🧩', t: 'Варіант «усі відповіді правильні» тут не передбачений.' },
  { e: '🎲', t: 'Можна вгадати. Або знати. Обирай мудро.' },
  { e: '🦾', t: 'ШІ не списував. А ти?' },
  { e: '📚', t: 'Книжка, яку ти не читав, зараз мовчить і сміється.' },
  { e: '💡', t: 'Геніальна думка прийде. Після здачі.' },
  { e: '🏆', t: 'Перше місце зайняте. Але друге ще вільне!' },
  { e: '🤖', t: 'Навіть ChatGPT іноді помиляється. Ти краще.' },
  { e: '🔮', t: 'Кришталева куля каже: ти знаєш більше, ніж думаєш.' },
  { e: '🎮', t: 'Save point не передбачений. Грай обережно.' },
  { e: '🌟', t: 'Зірки народжуються під тиском. Як і хороші оцінки.' },
  { e: '🔑', t: 'Ключ до успіху: читати питання до кінця.' },
]

// Floating orb – decorative background element
function Orb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: 'blur(60px)' }}
      animate={{ y: [0, -20, 0], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sloganIndex, setSloganIndex] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    setSloganIndex(Math.floor(Math.random() * SLOGANS.length))
    const interval = setInterval(() => {
      setSloganIndex(prev => (prev + 1) % SLOGANS.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      const user = useAuthStore.getState().user
      if (user?.role === 'STUDENT') {
        navigate('/student/dashboard', { replace: true })
      } else {
        navigate('/admin/dashboard', { replace: true })
      }
    } catch {
      // error is set in store
    }
  }

  const safeIdx = sloganIndex % SLOGANS.length
  const slogan = SLOGANS.find((_, i) => i === safeIdx) ?? SLOGANS[0]

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <Orb x="-10%"  y="10%"  size={500} color="rgba(139,92,246,0.14)"  delay={0} />
      <Orb x="60%"   y="-5%"  size={400} color="rgba(236,72,153,0.10)"  delay={2} />
      <Orb x="30%"   y="60%"  size={350} color="rgba(59,130,246,0.08)"  delay={1} />
      <Orb x="80%"   y="70%"  size={300} color="rgba(139,92,246,0.08)"  delay={3} />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-4"
          >
            <Logo size={56} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-slate-500 text-sm"
          >
            Інформаційна система оцінювання
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
          className="glass-card-elevated p-7"
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-unbounded text-xl font-bold text-white mb-3 leading-tight">
              Вхід до системи
            </h1>
            <div className="h-9 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={sloganIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-slate-500 text-sm flex items-center gap-2"
                >
                  <span>{slogan.e}</span>
                  <span>{slogan.t}</span>
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5"
              >
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Електронна пошта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className="glass-input text-sm"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="glass-input text-sm pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full btn-primary text-sm py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Вхід...
                </>
              ) : (
                <>
                  Увійти
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-slate-600 text-xs mt-5"
        >
          © {new Date().getFullYear()} GradeX — ISA
        </motion.p>
      </motion.div>
    </div>
  )
}
