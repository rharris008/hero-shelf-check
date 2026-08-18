// ============================================================
// App shell layout — top nav, offline badge, sync indicator
// ============================================================

import React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSync } from '../../hooks/useSync'

export function Layout() {
  const { repUser, signOut } = useAuth()
  const { pending, syncing, syncNow } = useSync()
  const location = useLocation()
  const isOnline = navigator.onLine

  const navLinks = [
    { to: '/check', label: 'Shelf Check' },
    { to: '/history', label: 'My Visits' },
    ...(repUser?.role === 'admin' ? [{ to: '/admin', label: 'Dashboard' }] : []),
  ]

  return (
    <div className="min-h-screen bg-abh-ltgrey flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Top nav */}
      <header className="bg-abh-navy text-white">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-abh-blue rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-bold text-sm">ShelfCheck</span>
          </div>

          {/* Right side: sync status + user */}
          <div className="flex items-center gap-3">
            {/* Offline indicator */}
            {!isOnline && (
              <span className="bg-abh-amber text-white text-xs rounded-full px-2 py-0.5 font-medium">
                Offline
              </span>
            )}

            {/* Pending sync badge */}
            {pending > 0 && (
              <button
                onClick={syncNow}
                disabled={syncing || !isOnline}
                className="bg-abh-blue text-white text-xs rounded-full px-2 py-0.5 font-medium
                           hover:bg-opacity-80 disabled:opacity-50 transition-colors"
              >
                {syncing ? 'Syncing...' : `${pending} pending`}
              </button>
            )}

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="text-blue-200 hover:text-white text-xs transition-colors"
            >
              {repUser?.full_name?.split(' ')[0] ?? 'Sign out'}
            </button>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex border-t border-white border-opacity-20 max-w-2xl mx-auto w-full">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex-1 text-center py-2.5 text-sm font-medium transition-colors ${
                location.pathname.startsWith(link.to)
                  ? 'text-white border-b-2 border-abh-blue'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
