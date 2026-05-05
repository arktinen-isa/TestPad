import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Logo from '../Logo'

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
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center hover:opacity-80 transition-opacity duration-200"
            >
              <Logo size={28} />
            </button>
            <button 
              onClick={() => navigate('/student/forms')}
              className="hidden sm:flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Форми
            </button>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-accent/30 border border-purple-accent/40 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-300">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-white">
                  {user?.name ? (user.name.split(' ').length > 1 ? user.name.split(' ')[1] : user.name) : 'Студент'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/profile')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">Профіль</span>
            </button>
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
