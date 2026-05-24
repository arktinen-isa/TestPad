import { Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import Logo from '../Logo'
import CommandPalette, { useCommandPalette } from '../CommandPalette'

export default function StudentLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const firstName = user?.name
    ? user.name.split(' ').length > 1 ? user.name.split(' ')[1] : user.name
    : 'Студент'

  return (
    <div className="min-h-screen bg-dark-bg bg-mesh flex flex-col">
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Navbar */}
      <nav
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(14,11,30,0.88)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <motion.button
            onClick={() => navigate('/student/dashboard')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center"
          >
            <Logo size={26} />
          </motion.button>

          <div className="flex items-center gap-2">
            {/* ⌘K search */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg
                         bg-white/[0.03] border border-white/[0.07]
                         text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]
                         transition-all duration-150 text-xs"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <kbd className="font-mono text-[10px]">⌘K</kbd>
            </button>

            <div className="w-px h-4 bg-white/[0.08] mx-1 hidden sm:block" />

            {/* User avatar + name */}
            <button
              onClick={() => navigate('/student/profile')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors duration-150 group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/40 to-blue-500/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
              <span className="hidden sm:block text-[13px] font-medium text-slate-300 group-hover:text-white transition-colors">
                {firstName}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[13px] text-slate-400
                         hover:text-red-400 hover:bg-red-500/8 transition-all duration-150 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Вийти</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
