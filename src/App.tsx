// ============================================================
// App — top-level routing
// ============================================================

import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { Layout } from './components/layout/Layout'
import { VisitForm } from './components/visits/VisitForm'
import { VisitHistory } from './components/visits/VisitHistory'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { startSyncEngine } from './lib/sync'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-abh-navy flex items-center justify-center">
        <div className="text-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { repUser } = useAuth()
  if (repUser?.role !== 'admin') return <Navigate to="/check" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { session } = useAuth()

  // Start sync engine once authenticated
  React.useEffect(() => {
    if (session) startSyncEngine()
  }, [session])

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/check" replace /> : <LoginPage />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/check" replace />} />
        <Route path="/check" element={<VisitForm />} />
        <Route path="/history" element={<VisitHistory />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/check" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
