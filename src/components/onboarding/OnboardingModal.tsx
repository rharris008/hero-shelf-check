// ============================================================
// OnboardingModal — first-login 4-card walkthrough
// Shown once per device. Stored in localStorage.
// ============================================================

import React, { useState } from 'react'

const STORAGE_KEY = 'hero_shelf_check_onboarded'

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEY, 'true')
}

const SLIDES = [
  {
    emoji: '👋',
    title: 'Welcome to Pureau Shelf Check',
    body: 'Four quick things and you\'re ready to go.',
    accent: '#1B2A4A',
  },
  {
    icon: (
      <svg className="w-12 h-12 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Pick your store',
    body: 'Your nearest stores appear automatically. Search by name, suburb, or postcode to find any store in the network.',
  },
  {
    icon: (
      <svg className="w-12 h-12 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Count every Pureau SKU',
    body: 'Enter the units you see on shelf. Always count — zero counts. Also tap what\'s in the backroom so we know if it\'s a ranging or replenishment issue.',
  },
  {
    icon: (
      <svg className="w-12 h-12 text-abh-blue mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    title: 'Works offline',
    body: 'No signal? No problem. Save your visit — it stores on your device and syncs automatically the moment you get connectivity.',
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
          <div className="mb-4">
            {'emoji' in s
              ? <span className="text-5xl">{(s as { emoji: string }).emoji}</span>
              : (s as { icon: React.ReactNode }).icon
            }
          </div>
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
