import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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
  { e: '🤓', t: 'Окуляри не додають інтелекту. Перевірено.' },
  { e: '💡', t: 'Геніальна думка прийде. Після здачі.' },
  { e: '🐢', t: 'Повільно — не означає правильно. Але швидко — теж ні.' },
  { e: '🎭', t: 'Головне — впевнений вигляд. Решта — технічні деталі.' },
  { e: '🏆', t: 'Перше місце зайняте. Але друге ще вільне!' },
  { e: '🤯', t: 'Після цього тесту ти станеш іншою людиною. Розумнішою.' },
  { e: '🕵️', t: 'Правильна відповідь десь тут. Знайди її.' },
  { e: '🦆', t: 'Качка знає відповідь. Запитай в качки.' },
  { e: '🌚', t: 'Темрява незнання — найкраща мотивація вчитися.' },
  { e: '🎸', t: 'Рок-зірки теж складали іспити. Деякі навіть здавали.' },
  { e: '🍕', t: 'Пройдеш тест — заслужив піцу. Не пройдеш — теж заслужив.' },
  { e: '🐉', t: 'Дракон знань чекає. Він добрий, але нетерплячий.' },
  { e: '🌈', t: 'В кінці тесту — веселка. Або оцінка. Або обидва.' },
  { e: '🤖', t: 'Навіть ChatGPT іноді помиляється. Ти краще.' },
  { e: '🎪', t: 'Ласкаво просимо до цирку знань! Вхід — лише з головою.' },
  { e: '🦁', t: 'Рик лева не допоможе. Але сміливість — так.' },
  { e: '🌮', t: 'Тест як тако: краще з начинкою знань.' },
  { e: '🏄', t: 'Серфінг по питаннях — набутий навик.' },
  { e: '🎩', t: 'Фокус-покус: знання з нічого не зявляються.' },
  { e: '🦋', t: 'Метелик знань сів на тебе. Не злякай його.' },
  { e: '🔮', t: 'Кришталева куля каже: ти знаєш більше, ніж думаєш.' },
  { e: '🐙', t: 'Восьминіг має 8 мізків. У тебе один, але який!' },
  { e: '🚂', t: 'Потяг знань відправляється. Квиток — твоя голова.' },
  { e: '🎮', t: 'Save point не передбачений. Грай обережно.' },
  { e: '🌵', t: 'Навіть кактус виживає. І ти здаш.' },
  { e: '🦊', t: 'Хитрість без знань — як Chrome без інтернету.' },
  { e: '🍀', t: 'Чотирилисник знайдеш після тесту. Зараз — питання.' },
  { e: '🐧', t: 'Пінгвін не вміє літати, але Linux запустить.' },
  { e: '🌍', t: 'Земля крутиться. Питання теж. Відповідай!' },
  { e: '🏰', t: 'Замок знань штурмують зсередини.' },
  { e: '🎻', t: 'Оркестр мозку готовий. Диригент — ти.' },
  { e: '🦅', t: 'Орел бачить усе зверху. Підіймись над задачею.' },
  { e: '🌙', t: 'Навіть вночі вчені вчаться. Ти теж можеш.' },
  { e: '🎁', t: 'Правильна відповідь — найкращий подарунок собі.' },
  { e: '🐬', t: 'Дельфіни розумніші за нас. Але вони не складають тести.' },
  { e: '🔑', t: 'Ключ до успіху: читати питання до кінця.' },
  { e: '🌟', t: 'Зірки народжуються під тиском. Як і хороші оцінки.' },
  { e: '🧲', t: 'Правильні відповіді самі притягуються. Іноді.' },
  { e: '🎯', t: 'Головне — не влучити в сусіда. У питання влучай!' },
];

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [slogan, setSlogan] = useState(SLOGANS[0])
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const getRandomSlogan = () => SLOGANS[Math.floor(Math.random() * SLOGANS.length)]

    // Set initial slogan
    setSlogan(getRandomSlogan())

    // Update slogan every 7 seconds
    const interval = setInterval(() => {
      setSlogan(getRandomSlogan())
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

  return (
    <div className="min-h-screen bg-dark-bg bg-mesh flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo / University branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-accent/20 border border-purple-accent/30 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L3 10v12l13 7 13-7V10L16 3z" stroke="#a855f7" strokeWidth="1.5" fill="none" />
              <path d="M16 3v19M3 10l13 7 13-7" stroke="#a855f7" strokeWidth="1.5" />
            </svg>
          </div>
          <h2 className="font-unbounded text-3xl font-bold text-white mb-1">
            GradeX
          </h2>
          <p className="text-slate-400 text-sm">
            Інформаційна система оцінювання результатів навчання
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <div className="mb-6">
            <h1 className="font-unbounded text-2xl font-bold text-white mb-2">
              Вхід до системи
            </h1>
            <p key={slogan.t} className="text-slate-400 text-sm flex items-center gap-2 animate-fade-in">
              <span className="text-lg">{slogan.e}</span> {slogan.t}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Електронна пошта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className="glass-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="glass-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary text-base py-4 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Вхід...
                </>
              ) : (
                <>
                  Увійти
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} GradeX — ISA
        </p>
      </div>
    </div>
  )
}
