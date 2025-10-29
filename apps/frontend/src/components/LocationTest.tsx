// apps/frontend/src/components/LocationTest.tsx
'use client'

import { useState } from 'react'
import { useDriverLocation } from '@/hooks/useDriverLocation'

export default function LocationTest() {
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const { location, watching } = useDriverLocation(trackingEnabled)

  const toggleTracking = () => {
    setTrackingEnabled(!trackingEnabled)
  }

  return (
    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span>📍</span>
          Location Tracking
        </h2>
        <button
          onClick={toggleTracking}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            watching ? 'bg-green-500' : 'bg-gray-300'
          }`}
          aria-label="Toggle location tracking"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              watching ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              watching ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className={`font-medium ${watching ? 'text-green-600' : 'text-gray-600'}`}>
            {watching ? 'Tracking Active' : 'Not Tracking'}
          </span>
        </div>
        {watching && location && (
          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors text-xs underline"
            title="View location on Google Maps"
          >
            view
          </a>
        )}
      </div>
    </div>
  )
}