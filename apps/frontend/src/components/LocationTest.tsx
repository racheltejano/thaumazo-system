// apps/frontend/src/components/LocationTest.tsx
'use client'

import { useState } from 'react'
import { useDriverLocation } from '@/hooks/useDriverLocation'

export default function LocationTest() {
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const { location, error, watching, isTracking } = useDriverLocation(trackingEnabled)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🧪 Location Tracking Test</h2>
        
        {/* Toggle Button */}
        <div className="mb-6">
          <button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              trackingEnabled
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {trackingEnabled ? '🛑 Stop Tracking' : '▶️ Start Tracking'}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${
                watching ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}
            />
            <span className="font-medium">
              Status: {watching ? '🟢 Tracking Active' : '⚫ Not Tracking'}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">⚠️ Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Location Data */}
        {isTracking && location && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium mb-2">✅ Location Data:</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Latitude:</span>
                  <p className="text-gray-900">{location.latitude.toFixed(6)}°</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Longitude:</span>
                  <p className="text-gray-900">{location.longitude.toFixed(6)}°</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Accuracy:</span>
                  <p className="text-gray-900">±{Math.round(location.accuracy)}m</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Speed:</span>
                  <p className="text-gray-900">
                    {location.speed !== null
                      ? `${Math.round(location.speed * 3.6)} km/h`
                      : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Heading:</span>
                  <p className="text-gray-900">
                    {location.heading !== null
                      ? `${Math.round(location.heading)}°`
                      : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Last Update:</span>
                  <p className="text-gray-900">
                    {new Date(location.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Google Maps Link */}
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              🗺️ View on Google Maps
            </a>
          </div>
        )}

        {/* Instructions */}
        {!isTracking && !error && trackingEnabled && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              ⏳ Waiting for GPS signal... This may take a few seconds.
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>📝 Test Instructions:</strong>
          </p>
          <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Click "Start Tracking" to begin</li>
            <li>Allow location access when prompted</li>
            <li>Check browser console for detailed logs</li>
            <li>Verify data is saved in Supabase dashboard</li>
            <li>Location updates every 10 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  )
}