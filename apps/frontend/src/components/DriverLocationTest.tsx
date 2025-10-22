// components/DriverLocationTest.tsx
'use client'

import { useState } from 'react'
import { useDriverLocationSubscription } from '@/hooks/useDriverLocationSubscription'
import { MapPin, Activity, Clock, Navigation, Gauge } from 'lucide-react'

export default function DriverLocationTest() {
  const [testDriverId, setTestDriverId] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  
  const { driverLocation, loading, error, lastUpdated } = useDriverLocationSubscription(
    testDriverId || null,
    isEnabled
  )

  const handleStartTest = () => {
    if (!testDriverId.trim()) {
      alert('Please enter a driver ID')
      return
    }
    setIsEnabled(true)
  }

  const handleStopTest = () => {
    setIsEnabled(false)
  }

  const formatSpeed = (speed: number | null) => {
    if (speed === null) return 'N/A'
    return `${(speed * 3.6).toFixed(1)} km/h`
  }

  const formatHeading = (heading: number | null) => {
    if (heading === null) return 'N/A'
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(heading / 45) % 8
    return `${heading.toFixed(0)}° (${directions[index]})`
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-xl">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Driver Location Subscription Test
          </h1>
          <p className="text-orange-100 text-sm mt-1">
            Test real-time driver location updates from Supabase
          </p>
        </div>

        {/* Test Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver ID
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={testDriverId}
              onChange={(e) => setTestDriverId(e.target.value)}
              placeholder="Enter driver UUID"
              disabled={isEnabled}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {!isEnabled ? (
              <button
                onClick={handleStartTest}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Start Test
              </button>
            ) : (
              <button
                onClick={handleStopTest}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Stop Test
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Get a driver ID from your profiles table where role='driver'
          </p>
        </div>

        {/* Status Section */}
        <div className="p-6 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                loading ? 'bg-yellow-500 animate-pulse' : 
                error ? 'bg-red-500' : 
                isEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="font-medium text-gray-900">
                {loading ? 'Connecting...' : 
                 error ? 'Connection Error' : 
                 isEnabled ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                Last update: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium flex items-center gap-2">
                ❌ Error
              </p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Location Data Display */}
          {isEnabled && !loading && !error && (
            <>
              {driverLocation ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Current Location Data
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coordinates */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Coordinates</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        <span className="font-mono">Lat: {driverLocation.latitude.toFixed(6)}</span>
                      </p>
                      <p className="text-sm text-blue-800">
                        <span className="font-mono">Lng: {driverLocation.longitude.toFixed(6)}</span>
                      </p>
                    </div>

                    {/* Speed */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-900">Speed</span>
                      </div>
                      <p className="text-2xl font-bold text-green-800">
                        {formatSpeed(driverLocation.speed)}
                      </p>
                    </div>

                    {/* Heading */}
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-900">Heading</span>
                      </div>
                      <p className="text-sm font-mono text-purple-800">
                        {formatHeading(driverLocation.heading)}
                      </p>
                    </div>

                    {/* Accuracy */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-900">Accuracy</span>
                      </div>
                      <p className="text-sm text-orange-800">
                        ±{Math.round(driverLocation.accuracy)}m
                      </p>
                    </div>
                  </div>

                  {/* Raw Data (for debugging) */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      Show Raw Data (JSON)
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
{JSON.stringify(driverLocation, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No location data received yet
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Waiting for driver location updates...
                  </p>
                </div>
              )}
            </>
          )}

          {/* Instructions when not testing */}
          {!isEnabled && (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">📋 How to Test:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Get a driver UUID from your database (profiles table where role='driver')</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>Paste the UUID in the input field above</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>Click "Start Test" to begin the subscription</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>Open your browser console to see detailed logs</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">5.</span>
                  <span>Update the driver_locations table to see real-time updates</span>
                </li>
              </ol>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  ⚠️ Make sure Supabase real-time is enabled for the driver_locations table
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}