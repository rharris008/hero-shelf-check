// ============================================================
// App — top-level routing
// ============================================================

import React, { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/auth/LoginPage'
import { Layout } from './components/layout/Layout'
import { VisitForm } from './components/visits/VisitForm'
import { VisitHistory } from './components/visits/VisitHistory'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { RepList } from './components/admin/RepList'
import { OnboardingModal, hasCompletedOnboarding } from './components/onboarding/OnboardingModal'
import { TermsModal } from './components/terms/TermsModal'
import { TermsPage } from './components/terms/TermsPage'
import { GuestReportPage } from './components/guest/GuestReportPage'
import { RoutePlanner } from './components/route/RoutePlanner'
import { startSyncEngine } from './lib/sync'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading, repLoading, repUser } = useAuth()

  if (loading || repLoading) {
    return (
      <div className="min-h-screen bg-abh-navy flex items-center justify-center">
        <div className="text-white text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Authenticated but no rep_users profile yet — pending admin activation
  if (!repUser) {
    return (
      <div className="min-h-screen bg-abh-navy flex flex-col items-center justify-center px-6 text-center"
           style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-16 h-16 rounded-full bg-abh-blue/20 border-2 border-abh-blue flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-abh-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white font-bold text-lg mb-2">Access pending</p>
        <p className="text-blue-200 text-sm max-w-xs mb-6">
          Your account is awaiting activation. Your manager will grant access shortly.
        </p>
        <p className="text-blue-300 text-xs mb-8">Signed in as {session.user.email}</p>
        <button
          onClick={() => { window.location.reload() }}
          className="text-abh-blue text-sm underline"
        >
          Refresh
        </button>
      </div>
    )
  }

  return <>{children}</>
}


function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { repUser, repLoading } = useAuth()
  if (repLoading) return null
  if (!repUser || repUser.role !== 'admin') {
    return (
      <div className="text-center py-16 px-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-14 h-14 bg-abh-ltgrey rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-abh-navy mb-1">Admin access required</p>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          This area is restricted to administrators. Contact your manager to request access.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function AppRoutes() {
  const { session, repUser } = useAuth()
  const [showTerms, setShowTerms] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  React.useEffect(() => {
    if (session) {
      startSyncEngine()
    }
  }, [session])

  // When repUser loads, determine which modal to show
  React.useEffect(() => {
    if (!repUser) return
    if (!repUser.terms_accepted_at) {
      setShowTerms(true)
      setShowOnboarding(false)
    } else if (!hasCompletedOnboarding()) {
      setShowTerms(false)
      setShowOnboarding(true)
    }
  }, [repUser])

  function handleTermsAccepted() {
    setShowTerms(false)
    if (!hasCompletedOnboarding()) setShowOnboarding(true)
  }

  return (
    <>
      {showTerms && <TermsModal onAccepted={handleTermsAccepted} />}
      {!showTerms && showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/check" replace /> : <LoginPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/report" element={<GuestReportPage />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/check" replace />} />
        <Route path="/check" element={<VisitForm />} />
        <Route path="/route" element={<RoutePlanner />} />
        <Route path="/history" element={<VisitHistory />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/reps"
          element={
            <RequireAdmin>
              <RepList />
            </RequireAdmin>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/check" replace />} />
    </Routes>
    </>
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
