// apps/frontend/src/hooks/useDriverLocationSubscription.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface DriverLocation {
  driver_id: string
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number
  updated_at: string
}

interface UseDriverLocationSubscriptionReturn {
  driverLocation: DriverLocation | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * Hook to subscribe to real-time driver location updates
 * @param driverId - The driver's ID to track
 * @param enabled - Whether to enable the subscription
 */
export function useDriverLocationSubscription(
  driverId: string | null | undefined,
  enabled: boolean = true
): UseDriverLocationSubscriptionReturn {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!enabled || !driverId) {
      console.log('🔌 Driver location subscription disabled or no driver assigned')
      setLoading(false)
      return
    }

    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      try {
        console.log('🔌 Setting up real-time subscription for driver:', driverId)

        // First, fetch the initial location
        const { data: initialLocation, error: fetchError } = await supabase
          .from('driver_locations')
          .select('*')
          .eq('driver_id', driverId)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.log('📍 No initial location found for driver yet')
          } else {
            console.error('❌ Error fetching initial location:', fetchError)
            setError('Failed to fetch driver location')
          }
        } else if (initialLocation) {
          console.log('📍 Initial driver location loaded:', initialLocation)
          setDriverLocation(initialLocation)
          setLastUpdated(new Date())
        }

        setLoading(false)

        // Set up real-time subscription
        channel = supabase
          .channel(`driver-location-${driverId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'driver_locations',
              filter: `driver_id=eq.${driverId}`,
            },
            (payload) => {
              console.log('📡 Real-time location update received:', payload)

              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const newLocation = payload.new as DriverLocation
                setDriverLocation(newLocation)
                setLastUpdated(new Date())
                setError(null)
                
                console.log('📍 Driver location updated:', {
                  lat: newLocation.latitude.toFixed(6),
                  lng: newLocation.longitude.toFixed(6),
                  speed: newLocation.speed ? `${Math.round(newLocation.speed * 3.6)} km/h` : 'N/A',
                  accuracy: `${Math.round(newLocation.accuracy)}m`,
                })
              } else if (payload.eventType === 'DELETE') {
                console.log('🗑️ Driver location deleted')
                setDriverLocation(null)
              }
            }
          )
          .subscribe((status) => {
            console.log('🔌 Subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to driver location updates')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error occurred')
              setError('Real-time connection error')
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ Subscription timed out')
              setError('Connection timed out')
            }
          })

        console.log('✅ Real-time subscription created')
      } catch (err) {
        console.error('❌ Failed to set up subscription:', err)
        setError('Failed to connect to real-time updates')
        setLoading(false)
      }
    }

    setupSubscription()

    // Cleanup function
    return () => {
      if (channel) {
        console.log('🛑 Cleaning up driver location subscription')
        supabase.removeChannel(channel)
      }
    }
  }, [driverId, enabled])

  return {
    driverLocation,
    loading,
    error,
    lastUpdated,
  }
}