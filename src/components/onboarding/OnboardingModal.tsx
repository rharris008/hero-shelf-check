// ============================================================
// OnboardingModal — first-login 4-card walkthrough
// Shown once per device. Stored in localStorage.
// ============================================================

import { useState } from 'react'

const STORAGE_KEY = 'hero_shelf_check_onboarded'

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEY, 'true')
}

const SLIDES = [
  {
    icon: (
      <svg className="w-14 h-14 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Find your store',
    body: 'Search by store name, suburb, or postcode. Select your store before starting the check — you cannot free-type a store name.',
  },
  {
    icon: (
      <svg className="w-14 h-14 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Count shelf units',
    body: 'Enter the number of Pureau units you can see on the shelf for each product. Zero is a valid count — always record what you see.',
  },
  {
    icon: (
      <svg className="w-14 h-14 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    title: 'Check the backroom',
    body: 'For each product, tap Counted (and enter units), None present, or Could not check. This tells us if a store is low on shelf but has stock waiting.',
  },
  {
    icon: (
      <svg className="w-14 h-14 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Save — works offline',
    body: 'Tap Save visit. Your check is saved to your device immediately. It syncs to the server automatically within 60 seconds when you have a connection.',
  },
]

interface OnboardingModalProps {
  onDone: () => void
}

export function OnboardingModal({ onDone }: OnboardingModalProps) {
  const [slide, setSlide] = useState(0)
  const isLast = slide === SLIDES.length - 1

  function handleNext() {
    if (isLast) {
      markOnboardingComplete()
      onDone()
    } else {
      setSlide(s => s + 1)
    }
  }

  const s = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-1">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all ${
                i === slide ? 'w-6 h-2 bg-abh-navy' : 'w-2 h-2 bg-abh-mdgrey'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-center min-h-[220px] flex flex-col items-center justify-center">
          <div className="mb-4">{s.icon}</div>
          <h2 className="font-bold text-abh-navy text-lg mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            {s.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
            {s.body}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          {slide > 0 && (
            <button
              onClick={() => setSlide(s => s - 1)}
              className="flex-1 border border-abh-mdgrey rounded-xl py-3 text-sm font-medium text-abh-dktext"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-abh-navy text-white rounded-xl py-3 text-sm font-bold"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
