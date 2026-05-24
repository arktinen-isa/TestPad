import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import apiClient from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { StudentTest, Form } from '../../types'
import { useTestStore } from '../../store/testStore'
import { useState } from 'react'
import { generateCertificate } from '../../utils/certificateGenerator'

// ─── Helpers ──────────────────────────────────────────────────
function getPlural(n: number, one: string, few: string, many: string) {
  const d  = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return one
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return few
  return many
}

function getTestStatusInfo(test: StudentTest) {
  const now  = new Date()
  const from  = test.openFrom  ? new Date(test.openFrom)  : null
  const until = test.openUntil ? new Date(test.openUntil) : null
  const attemptsLeft = test.maxAttempts - (test.attemptsUsed || 0)

  if (test.status === 'DRAFT')  return { label: 'Чернетка',      color: 'status-badge status-draft',  available: false }
  if (test.status === 'CLOSED') return { label: 'Закрито',       color: 'status-badge status-closed', available: false }
  if (from  && now < from)      return { label: 'Ще не відкрито', color: 'status-badge status-draft',  available: false }
  if (until && now > until)     return { label: 'Завершено',      color: 'status-badge status-closed', available: false }
  if (attemptsLeft <= 0)        return { label: 'Вичерпано спроби', color: 'status-badge status-closed', available: false }
  return { label: 'Доступний', color: 'status-badge status-open', available: true }
}

// ─── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1 mr-4">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-5 w-20 rounded-full flex-shrink-0" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-28 rounded-full" />
      </div>
      <div className="skeleton h-11 w-full rounded-xl" />
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-12 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-purple-accent/10 border border-purple-accent/15 flex items-center justify-center mx-auto mb-4 text-purple-400">
        {icon}
      </div>
      <h3 className="font-unbounded text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">{desc}</p>
    </motion.div>
  )
}

// ─── Test card ─────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0, 0, 1] as [number,number,number,number] } },
}

function TestCard({ test }: { test: StudentTest }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const status = getTestStatusInfo(test)
  const attemptsLeft = test.maxAttempts - (test.attemptsUsed || 0)
  const activeAttemptId = test.lastAttempt && !test.lastAttempt.finishedAt ? test.lastAttempt.id : null
  const [isActionLoading, setIsActionLoading] = useState(false)
  const { resumeAttempt } = useTestStore()

  const handleAction = async () => {
    setIsActionLoading(true)
    if (activeAttemptId) {
      try {
        await resumeAttempt(activeAttemptId)
        navigate(`/student/test/${test.id}/take`)
      } catch {
        navigate(`/student/test/${test.id}/start`)
      } finally {
        setIsActionLoading(false)
      }
    } else {
      navigate(`/student/test/${test.id}/start`)
    }
  }

  const handleDownloadCertificate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!test.lastAttempt || !user) return
    const score = test.scoringMode === 'PERCENTAGE'
      ? `${test.lastAttempt.percentage}%`
      : `${test.lastAttempt.score} / ${test.lastAttempt.maxScore}`
    generateCertificate(user.name, test.title, score, test.lastAttempt.finishedAt || '', test.logoUrl)
  }

  return (
    <motion.div
      variants={cardVariants}
      className="glass-card p-5 flex flex-col gap-4 hover:border-white/12 transition-colors duration-200 group relative"
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-unbounded text-sm font-semibold text-white group-hover:text-purple-300 transition-colors duration-200 leading-snug">
            {test.title}
          </h3>
          {test.subject && (
            <p className="text-slate-500 text-xs mt-1">{test.subject}</p>
          )}
        </div>
        <span className={`${status.color} flex-shrink-0`}>{status.label}</span>
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-500 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
          <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {test.timeLimitMin} {getPlural(test.timeLimitMin, 'хв', 'хв', 'хв')}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
          <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {test.questionsCount} {getPlural(test.questionsCount, 'питання', 'питання', 'питань')}
        </span>
        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border
          ${attemptsLeft > 0
            ? 'text-slate-500 bg-white/[0.03] border-white/[0.06]'
            : 'text-red-400/80 bg-red-500/8 border-red-500/15'}`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {attemptsLeft <= 0
            ? 'Немає спроб'
            : `${attemptsLeft} ${getPlural(attemptsLeft, 'спроба', 'спроби', 'спроб')}`}
        </span>
      </div>

      {/* Date window */}
      {(test.openFrom || test.openUntil) && (
        <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] border-dashed text-[11px]">
          {test.openFrom && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 uppercase tracking-wider font-semibold">Відкриття</span>
              <span className="text-slate-400 font-medium">
                {new Date(test.openFrom).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {test.openUntil && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 uppercase tracking-wider font-semibold">Дедлайн</span>
              <span className="text-slate-400 font-medium">
                {new Date(test.openUntil).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last attempt result */}
      {test.lastAttempt?.finishedAt && test.showResultMode !== 'ADMIN_ONLY' && (
        <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-600 mb-0.5 uppercase tracking-wider font-semibold">Остання спроба</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {test.scoringMode === 'PERCENTAGE'
                  ? `${test.lastAttempt.percentage ?? 0}%`
                  : `${test.lastAttempt.score ?? 0} / ${test.lastAttempt.maxScore ?? 0}`}
              </span>
              <span className={`text-xs font-semibold ${test.lastAttempt.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {test.lastAttempt.passed ? '✓ Складено' : '✗ Не складено'}
              </span>
            </div>
          </div>
          {test.allowCertificate && test.lastAttempt.passed && (
            <motion.button
              onClick={handleDownloadCertificate}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/15"
              title="Завантажити сертифікат"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </motion.button>
          )}
        </div>
      )}

      {/* CTA button */}
      {status.available || activeAttemptId ? (
        <motion.button
          onClick={handleAction}
          disabled={isActionLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full mt-auto text-sm px-5 py-3 rounded-xl font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
            activeAttemptId
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
              : 'btn-primary'
          }`}
        >
          {isActionLoading && (
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {activeAttemptId ? 'Продовжити тест →' : 'Розпочати тест →'}
        </motion.button>
      ) : (
        <button disabled className="w-full px-5 py-3 rounded-xl font-semibold text-slate-600 bg-white/[0.03] border border-white/[0.06] cursor-not-allowed text-sm mt-auto">
          {test.status === 'CLOSED'
            ? 'Тест закрито'
            : attemptsLeft <= 0 ? 'Спроб немає' : 'Очікування'}
        </button>
      )}
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'tests' | 'forms'>('tests')

  const { data: tests, isLoading, error } = useQuery<StudentTest[]>({
    queryKey: ['student-tests'],
    queryFn: async () => {
      const res = await apiClient.get('/tests')
      return res.data.data
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })

  const { data: forms, isLoading: isFormsLoading } = useQuery<Form[]>({
    queryKey: ['student-forms'],
    queryFn: async () => {
      const res = await apiClient.get('/forms')
      return res.data
    },
    staleTime: 1000 * 60,
  })

  const firstName = user?.name
    ? user.name.split(' ').length > 1 ? user.name.split(' ')[1] : user.name
    : 'Студент'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Welcome header */}
      <div>
        <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-1.5">
          Вітаємо, {firstName} 👋
        </h1>
        <p className="text-slate-500 text-sm">
          Ваш персональний кабінет для проходження тестів та опитувань
        </p>
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4 border-red-500/25 flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 text-sm">Помилка завантаження. Спробуйте оновити сторінку.</p>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05] w-fit">
        {([
          { key: 'tests', label: 'Тести', count: tests?.length },
          { key: 'forms', label: 'Опитування', count: forms?.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="tabBg"
                className="absolute inset-0 bg-purple-accent/25 border border-purple-accent/30 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
              activeTab === tab.key
                ? 'bg-purple-accent/30 text-purple-200'
                : 'bg-white/[0.05] text-slate-600'
            }`}>
              {tab.count ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Content with AnimatePresence */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'tests' && (
          <motion.div
            key="tests"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : tests && tests.length > 0 ? (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {tests.map(test => <TestCard key={test.id} test={test} />)}
              </motion.div>
            ) : (
              <EmptyState
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="Тести відсутні"
                desc="На даний момент для вашої групи немає доступних тестів."
              />
            )}
          </motion.div>
        )}

        {activeTab === 'forms' && (
          <motion.div
            key="forms"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {isFormsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : forms && forms.length > 0 ? (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {forms.map(form => {
                  const isSubmitted = form.submissions && form.submissions.length > 0
                  return (
                    <motion.div
                      key={form.id}
                      variants={cardVariants}
                      whileHover={{ y: -2, transition: { duration: 0.15 } }}
                      className="glass-card p-5 flex flex-col justify-between hover:border-white/12 transition-colors duration-200 group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-accent/12 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                              {form._count?.fields || 0} питань
                            </span>
                            {form.openUntil && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/12 text-amber-400 text-[10px] font-bold">
                                До: {new Date(form.openUntil).toLocaleDateString('uk-UA')}
                              </span>
                            )}
                          </div>
                          <span className={`status-badge ${isSubmitted ? 'status-open' : 'status-draft'}`}>
                            {isSubmitted ? 'Заповнено ✓' : 'Не заповнено'}
                          </span>
                        </div>
                        <h3 className="font-unbounded text-sm font-bold text-white group-hover:text-purple-300 transition-colors duration-200 mb-2 leading-snug">
                          {form.title}
                        </h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                          {form.description || 'Опис відсутній'}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => navigate(`/student/forms/${form.id}`)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full py-2.5 px-5 rounded-xl font-semibold text-sm transition-all duration-150 text-center ${
                          isSubmitted
                            ? 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300'
                            : 'btn-primary'
                        }`}
                      >
                        {isSubmitted ? 'Редагувати відповідь' : 'Пройти опитування'}
                      </motion.button>
                    </motion.div>
                  )
                })}
              </motion.div>
            ) : (
              <EmptyState
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                title="Опитування відсутні"
                desc="На даний момент для вас немає активних опитувань."
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
