import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

interface CommandItem {
  id: string
  label: string
  group: string
  icon: React.ReactNode
  action: () => void
  shortcut?: string
}

const DashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const GroupsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const QuestionsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TestsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const FormsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CatIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
  </svg>
)

const ProfileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()

  const go = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
    onClose()
  }, [logout, navigate, onClose])

  const adminItems: CommandItem[] = [
    { id: 'dash',      label: 'Дашборд',      group: 'Навігація', icon: <DashIcon />,      action: () => go('/admin/dashboard') },
    { id: 'users',     label: 'Користувачі',  group: 'Навігація', icon: <UsersIcon />,     action: () => go('/admin/users') },
    { id: 'groups',    label: 'Групи',         group: 'Навігація', icon: <GroupsIcon />,    action: () => go('/admin/groups') },
    { id: 'questions', label: 'Питання',       group: 'Навігація', icon: <QuestionsIcon />, action: () => go('/admin/questions') },
    { id: 'cats',      label: 'Категорії',     group: 'Навігація', icon: <CatIcon />,       action: () => go('/admin/categories') },
    { id: 'tests',     label: 'Тести',         group: 'Навігація', icon: <TestsIcon />,     action: () => go('/admin/tests') },
    { id: 'forms',     label: 'Форми',         group: 'Навігація', icon: <FormsIcon />,     action: () => go('/admin/forms') },
    { id: 'profile',   label: 'Профіль',       group: 'Акаунт',    icon: <ProfileIcon />,   action: () => go('/admin/profile') },
    { id: 'logout',    label: 'Вийти',         group: 'Акаунт',    icon: <LogoutIcon />,    action: handleLogout },
  ]

  const studentItems: CommandItem[] = [
    { id: 'dash',    label: 'Мої тести',  group: 'Навігація', icon: <TestsIcon />,   action: () => go('/student/dashboard') },
    { id: 'forms',   label: 'Опитування', group: 'Навігація', icon: <FormsIcon />,   action: () => go('/student/forms') },
    { id: 'profile', label: 'Профіль',    group: 'Акаунт',    icon: <ProfileIcon />, action: () => go('/student/profile') },
    { id: 'logout',  label: 'Вийти',      group: 'Акаунт',    icon: <LogoutIcon />,  action: handleLogout },
  ]

  const items = user?.role === 'STUDENT' ? studentItems : adminItems

  const groups = [...new Set(items.map(i => i.group))]

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="glass-card-elevated overflow-hidden"
              loop
            >
              {/* Search input */}
              <div className="flex items-center border-b border-white/[0.08] px-1">
                <svg className="w-4 h-4 text-slate-500 ml-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Command.Input placeholder="Пошук або перехід..." />
              </div>

              <Command.List>
                <Command.Empty>Нічого не знайдено</Command.Empty>

                {groups.map((group) => (
                  <Command.Group key={group} heading={group}>
                    {items
                      .filter(i => i.group === group)
                      .map(item => (
                        <Command.Item
                          key={item.id}
                          value={item.label}
                          onSelect={item.action}
                        >
                          <span className={`flex-shrink-0 ${item.id === 'logout' ? 'text-red-400' : 'text-slate-400'}`}>
                            {item.icon}
                          </span>
                          <span className={item.id === 'logout' ? 'text-red-300' : ''}>
                            {item.label}
                          </span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↑↓</kbd>
                    вибір
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↵</kbd>
                    перейти
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">esc</kbd>
                    закрити
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">⌘K</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
