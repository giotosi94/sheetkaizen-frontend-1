import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import KaizenListPage from './pages/KaizenListPage'
import KaizenDetailPage from './pages/KaizenDetailPage'
import ActionPlanPage from './pages/ActionPlanPage'
import DashboardListPage from './pages/DashboardListPage'
import DashboardDetailPage from './pages/DashboardDetailPage'
import DocumentiPage from './pages/DocumentiPage'
import SettingsPage from './pages/SettingsPage'
import PillarListPage from './pages/PillarListPage'
import PillarDetailPage from './pages/PillarDetailPage'
import AdminPage from './pages/AdminPage'


export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login: PUBLIC (no auth required) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Tutte le altre route sono PROTETTE */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="kaizen" element={<KaizenListPage />} />
          <Route path="kaizen/:id" element={<KaizenDetailPage />} />
          <Route path="action-plan" element={<ActionPlanPage />} />
          <Route path="dashboard" element={<DashboardListPage />} />
          <Route path="dashboard/:id" element={<DashboardDetailPage />} />
          <Route path="documenti" element={<DocumentiPage />} />
          <Route path="pillars" element={<PillarListPage />} />
          <Route path="pillars/:id" element={<PillarDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Admin: solo per role=admin */}
          <Route
            path="admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all: redirect a home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  )
}
