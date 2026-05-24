import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/authStore'
import { Role } from './types'

// Layouts
import StudentLayout from './components/Layout/StudentLayout'
import AdminLayout from './components/Layout/AdminLayout'

// Pages
import Login from './pages/Login'
import StudentDashboard from './pages/student/StudentDashboard'
import TestStart from './pages/student/TestStart'
import TestTake from './pages/student/TestTake'
import TestResult from './pages/student/TestResult'
import AdminDashboard from './pages/admin/AdminDashboard'
import UsersPage from './pages/admin/UsersPage'
import GroupsPage from './pages/admin/GroupsPage'
import QuestionsPage from './pages/admin/QuestionsPage'
import TestsPage from './pages/admin/TestsPage'
import TestResultsPage from './pages/admin/TestResultsPage'
import CategoriesPage from './pages/admin/CategoriesPage'
import FormsPage from './pages/admin/FormsPage'
import FormEditor from './pages/admin/FormEditor'
import FormResultsPage from './pages/admin/FormResultsPage'
import StudentFormsPage from './pages/student/StudentFormsPage'
import FormFillPage from './pages/student/FormFillPage'
import ProfilePage from './pages/ProfilePage'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: Role[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, accessToken } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'STUDENT') {
      return <Navigate to="/student/dashboard" replace />
    }
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}

function RootRedirect() {
  const { user, accessToken } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />
  }

  return <Navigate to="/admin/dashboard" replace />
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Student routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="test/:testId/start" element={<TestStart />} />
            <Route path="test/:testId/take" element={<TestTake />} />
            <Route path="test/:testId/result" element={<TestResult />} />
            <Route path="forms" element={<StudentFormsPage />} />
            <Route path="forms/:id" element={<FormFillPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Admin/Teacher routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="tests/:testId/results" element={<TestResultsPage />} />
            <Route path="forms" element={<FormsPage />} />
            <Route path="forms/new" element={<FormEditor />} />
            <Route path="forms/:id/edit" element={<FormEditor />} />
            <Route path="forms/:id/results" element={<FormResultsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const { init, isInitialized } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-purple-accent/20" />
          <div className="absolute inset-0 rounded-full border-2 border-purple-accent border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1628',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
        theme="dark"
      />
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
