// ============================================================
// TermsModal — shown on first login when terms_accepted_at is null.
// User must Accept before accessing the app. Records acceptance
// in Supabase rep_users.terms_accepted_at.
// ============================================================

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface TermsModalProps {
  onAccepted: () => void
}

export function TermsModal({ onAccepted }: TermsModalProps) {
  const { acceptTerms, signOut } = useAuth()
  const [accepting, setAccepting] = useState(false)

  async function handleAccept() {
    setAccepting(true)
    await acceptTerms()
    setAccepting(false)
    onAccepted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-60 sm:items-center">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-abh-navy px-6 pt-5 pb-4">
          <h2 className="text-white font-bold text-base" style={{ fontFamily: 'Arial, sans-serif' }}>
            Terms of Use
          </h2>
          <p className="text-blue-200 text-xs mt-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>
            Australian Beverage Holdings Pty Ltd
          </p>
        </div>

        {/* Scrollable terms body */}
        <div className="px-5 py-4 max-h-72 overflow-y-auto text-xs text-gray-700 space-y-3"
             style={{ fontFamily: 'Arial, sans-serif' }}>
          <p><strong>1. Authorised use only.</strong> This application is for authorised Australian Beverage Holdings field representatives only. Your login is personal and non-transferable. You must not share your credentials.</p>
          <p><strong>2. Data accuracy.</strong> You must record shelf counts and backroom observations accurately and honestly. Falsifying data is grounds for immediate access termination.</p>
          <p><strong>3. Photography.</strong> Photos captured through this app must relate only to Pureau product placement on shelf. Do not photograph people, private information, or non-Pureau areas without authorisation.</p>
          <p><strong>4. Confidentiality.</strong> All data, reports, and information you access through this application are confidential to Australian Beverage Holdings Pty Ltd. You must not disclose or distribute this information to any third party.</p>
          <p><strong>5. Device and connectivity.</strong> You are responsible for ensuring your device meets the app requirements. Offline data will sync automatically when connectivity is restored — you must ensure sync completes before ending a visit period.</p>
          <p><strong>6. Data stored.</strong> This app stores your visit records, store selections, shelf counts, backroom observations, photos, and device location data (where available). This data is used solely for retail merchandising and compliance reporting by Australian Beverage Holdings Pty Ltd.</p>
          <p><strong>7. Termination.</strong> Access may be revoked at any time at the discretion of Australian Beverage Holdings Pty Ltd.</p>
          <p className="text-gray-400 pt-1">By tapping Accept below, you agree to these Terms of Use. Your acceptance is recorded with a timestamp.</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 pt-3 flex gap-3">
          <button
            onClick={() => signOut()}
            className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 bg-abh-navy text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {accepting ? 'Recording...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
