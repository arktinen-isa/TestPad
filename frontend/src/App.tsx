import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="tests" element={<TestsPage />} />
          <Route path="tests/:testId/results" element={<TestResultsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
