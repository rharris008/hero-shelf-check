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
import { OnboardingModal, hasCompletedOnboarding } from './components/onboarding/OnboardingModal'
import { TermsModal } from './components/terms/TermsModal'
import { TermsPage } from './components/terms/TermsPage'
import { GuestReportPage } from './components/guest/GuestReportPage'
import { startSyncEngine } from './lib/sync'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, repUser, loading, repLoading } = useAuth()

  // Waiting for Supabase auth session
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

  return <>{children}</>
}

function AccessPendingScreen() {
  const { signOut, repError } = useAuth()
  return (
    <div className="min-h-screen bg-abh-navy flex flex-col items-center justify-center px-6 text-center"
         style={{ fontFamily: 'Arial, sans-serif' }}>
      <p className="text-white font-bold text-base mb-2">Access pending</p>
      <p className="text-blue-200 text-sm max-w-xs mb-6">
        Your account has been created. A manager needs to activate your access before you can use the app.
        Contact your manager or email{' '}
        <a href="mailto:enquiries@abhgroup.com.au" className="underline text-white">
          enquiries@abhgroup.com.au
        </a>
      </p>
      <button
        onClick={() => signOut()}
        className="text-xs text-blue-300 underline hover:text-white"
      >
        Sign out
      </button>
      {repError && (
        <p className="mt-4 text-xs text-red-300 bg-black/30 rounded px-3 py-2 max-w-xs break-all">
          {repError}
        </p>
      )}
    </div>
  )
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  // TODO: restore repUser?.role === 'admin' check once RLS fetch is fixed
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
