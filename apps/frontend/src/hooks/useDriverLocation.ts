import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface LocationData {
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number
  timestamp: number
}

interface UseDriverLocationReturn {
  location: LocationData | null
  error: string | null
  watching: boolean
  isTracking: boolean
}

/**
 * Hook to track driver's real-time GPS location
 * @param shouldTrack - Boolean to control when tracking is active
 * @returns Location data, error state, and tracking status
 */
export function useDriverLocation(shouldTrack: boolean = false): UseDriverLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    // Don't track if not needed
    if (!shouldTrack) {
      console.log('📍 Location tracking disabled (no active orders)')
      
      // Clean up if tracking was active
      if (watchIdRef.current !== null) {
        console.log('🛑 Stopping location tracking')
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        setWatching(false)
      }
      return
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      console.error('❌ Geolocation not supported')
      return
    }

    const startTracking = async () => {
      try {
        // Get current user (driver)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (!user || userError) {
          setError('User not authenticated')
          console.error('❌ User authentication failed:', userError)
          return
        }

        console.log('🚗 Starting location tracking for driver:', user.id)
        setWatching(true)
        setError(null)

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            const now = Date.now()
            const timeSinceLastUpdate = now - lastUpdateRef.current

            // Only update every 10 seconds to save battery and database writes
            if (timeSinceLastUpdate < 10000 && lastUpdateRef.current !== 0) {
              console.log('⏭️ Skipping update (too soon)')
              return
            }

            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed, // meters per second (can be null)
              heading: position.coords.heading, // degrees (can be null)
              accuracy: position.coords.accuracy, // meters
              timestamp: position.timestamp
            }

            // Update local state
            setLocation(locationData)
            lastUpdateRef.current = now

            console.log('📍 Location updated:', {
              lat: locationData.latitude.toFixed(6),
              lng: locationData.longitude.toFixed(6),
              accuracy: `${Math.round(locationData.accuracy)}m`,
              speed: locationData.speed ? `${Math.round(locationData.speed * 3.6)} km/h` : 'N/A'
            })

            // Update database using upsert (insert or update)
            try {
              const { error: updateError } = await supabase
                .from('driver_locations')
                .upsert({
                  driver_id: user.id,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  speed: locationData.speed,
                  heading: locationData.heading,
                  accuracy: locationData.accuracy,
                  updated_at: new Date(locationData.timestamp).toISOString()
                }, {
                  onConflict: 'driver_id', // Update if driver already has a location record
                  ignoreDuplicates: false
                })

              if (updateError) {
                console.error('❌ Failed to update location in database:', updateError)
                setError('Failed to update location: ' + updateError.message)
              } else {
                console.log('✅ Location saved to database')
                setError(null) // Clear any previous errors
              }
            } catch (err) {
              console.error('❌ Database update error:', err)
              setError('Database error occurred')
            }
          },
          (error) => {
            let errorMessage = 'Unknown error'
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location access.'
                break
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable'
                break
              case error.TIMEOUT:
                errorMessage = 'Location request timed out'
                break
            }

            console.error('❌ Geolocation error:', errorMessage, error)
            setError(errorMessage)
          },
          {
            enableHighAccuracy: true, // Use GPS for better accuracy
            maximumAge: 10000, // Accept cached position up to 10 seconds old
            timeout: 5000 // Wait max 5 seconds for position
          }
        )

        console.log('✅ Location tracking started with watchId:', watchIdRef.current)

      } catch (err) {
        console.error('❌ Failed to start tracking:', err)
        setError('Failed to start location tracking')
      }
    }

    startTracking()

    // Cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        console.log('🛑 Cleaning up location tracking')
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        setWatching(false)
      }
    }
  }, [shouldTrack])

  return {
    location,
    error,
    watching,
    isTracking: watching && location !== null
  }
}