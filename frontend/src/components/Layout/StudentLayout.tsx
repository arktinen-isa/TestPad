import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function StudentLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dark-bg bg-mesh flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md bg-dark-bg/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-accent/20 border border-purple-accent/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M16 3L3 10v12l13 7 13-7V10L16 3z" stroke="#a855f7" strokeWidth="2" fill="none"/>
                <path d="M16 3v19M3 10l13 7 13-7" stroke="#a855f7" strokeWidth="2"/>
              </svg>
            </div>
            <span className="font-unbounded text-sm font-bold text-white">
              ОМФК Тестування
            </span>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-accent/30 border border-purple-accent/40 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-300">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Студент</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
