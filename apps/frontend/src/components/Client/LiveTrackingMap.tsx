// components/Client/LiveTrackingMap.tsx
'use client'

import { useMemo, useEffect, useState } from 'react'
import Image from 'next/image'
import { Navigation, Clock } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export interface DriverLocation {
  latitude: number
  longitude: number
  speed?: number | null
  accuracy?: number
}

interface LiveTrackingMapProps {
  // Pickup coordinates
  pickupLat?: number | null
  pickupLng?: number | null
  
  // Driver location data
  driverLocation?: DriverLocation | null
  lastUpdated?: string | null
  
  // Control flags
  isTrackingEnabled: boolean
  
  // Fallback static map URL
  fallbackMapUrl?: string
  
  // Optional customization
  width?: number
  height?: number
  style?: 'streets-v11' | 'outdoors-v11' | 'satellite-v9' | 'dark-v10' | 'light-v10'
  className?: string
  
  // Stale data threshold in minutes (default: 5)
  staleThresholdMinutes?: number
  
  // Optional callback to send ETA back to parent
  onEtaCalculated?: (eta: { duration: number; distance: number } | null) => void
}

interface RouteData {
  duration: number // in seconds
  distance: number // in meters
  geometry: string // encoded polyline
}

export default function LiveTrackingMap({
  pickupLat,
  pickupLng,
  driverLocation,
  lastUpdated,
  isTrackingEnabled,
  fallbackMapUrl,
  width = 700,
  height = 300,
  style = 'streets-v11',
  className = '',
  staleThresholdMinutes = 5,
  onEtaCalculated
}: LiveTrackingMapProps) {
  
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [lastRouteFetch, setLastRouteFetch] = useState<number>(0)

  // Memoize driver coordinates to prevent unnecessary re-fetches
  const driverCoords = useMemo(() => {
    if (!driverLocation) return null
    // Round to 4 decimal places (~11m precision) to avoid micro-movements triggering updates
    return {
      lat: Math.round(driverLocation.latitude * 10000) / 10000,
      lng: Math.round(driverLocation.longitude * 10000) / 10000
    }
  }, [driverLocation?.latitude, driverLocation?.longitude])

  // Fetch route from Mapbox Directions API (with 5-minute minimum interval)
  useEffect(() => {
    if (!MAPBOX_TOKEN || !isTrackingEnabled || !driverCoords || !pickupLat || !pickupLng) {
      setRouteData(null)
      if (onEtaCalculated) onEtaCalculated(null)
      return
    }

    // Check if data is recent
    if (lastUpdated) {
      const staleThreshold = new Date(Date.now() - staleThresholdMinutes * 60 * 1000)
      const isRecent = new Date(lastUpdated) > staleThreshold
      if (!isRecent) {
        setRouteData(null)
        if (onEtaCalculated) onEtaCalculated(null)
        return
      }
    }

    // RATE LIMITING: Only fetch route every 5 minutes (300000ms)
    const now = Date.now()
    const timeSinceLastFetch = now - lastRouteFetch
    const MIN_FETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes

    if (lastRouteFetch > 0 && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      const waitTime = Math.ceil((MIN_FETCH_INTERVAL - timeSinceLastFetch) / 1000)
      console.log(`⏭️ Skipping route fetch (last fetched ${Math.floor(timeSinceLastFetch / 1000)}s ago, waiting ${waitTime}s more)`)
      return
    }

    const fetchRoute = async () => {
      setIsLoadingRoute(true)
      setLastRouteFetch(Date.now())
      
      try {
        const driverLng = driverCoords.lng
        const driverLat = driverCoords.lat

        // Mapbox Directions API: driving profile
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLng},${driverLat};${pickupLng},${pickupLat}?geometries=polyline&overview=full&access_token=${MAPBOX_TOKEN}`
        
        console.log('🗺️ Fetching route from Mapbox Directions API...')
        
        const response = await fetch(url)
        const data = await response.json()

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const newRouteData: RouteData = {
            duration: route.duration, // seconds
            distance: route.distance, // meters
            geometry: route.geometry
          }
          
          setRouteData(newRouteData)
          
          console.log('✅ Route fetched:', {
            duration: `${Math.round(route.duration / 60)} min`,
            distance: `${(route.distance / 1000).toFixed(2)} km`
          })

          // Send ETA back to parent if callback provided
          if (onEtaCalculated) {
            onEtaCalculated({
              duration: route.duration,
              distance: route.distance
            })
          }
        } else {
          console.warn('⚠️ No route found')
          setRouteData(null)
          if (onEtaCalculated) onEtaCalculated(null)
        }
      } catch (error) {
        console.error('❌ Failed to fetch route:', error)
        setRouteData(null)
        if (onEtaCalculated) onEtaCalculated(null)
      } finally {
        setIsLoadingRoute(false)
      }
    }

    fetchRoute()
  }, [
    driverCoords, // Now memoized and rounded
    pickupLat,
    pickupLng,
    isTrackingEnabled,
    lastUpdated,
    staleThresholdMinutes
    // Removed onEtaCalculated from deps to prevent loops
  ])

  const mapData = useMemo(() => {
    // No Mapbox token available
    if (!MAPBOX_TOKEN) {
      return {
        url: fallbackMapUrl,
        isLive: false,
        reason: 'no_token'
      }
    }

    // Tracking not enabled or no driver location data
    if (!isTrackingEnabled || !driverLocation || !lastUpdated) {
      // Try to show static pickup map if coordinates exist
      if (pickupLat && pickupLng) {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/${style}/static/pin-s+ff0000(${pickupLng},${pickupLat})/${pickupLng},${pickupLat},15/${width}x${height}?access_token=${MAPBOX_TOKEN}`,
          isLive: false,
          reason: 'tracking_disabled'
        }
      }
      return {
        url: fallbackMapUrl,
        isLive: false,
        reason: 'no_coordinates'
      }
    }

    // Check if driver location data is recent
    const staleThreshold = new Date(Date.now() - staleThresholdMinutes * 60 * 1000)
    const isRecent = new Date(lastUpdated) > staleThreshold
    
    if (!isRecent) {
      console.warn(`🗺️ Driver location is stale (last updated: ${lastUpdated})`)
      // Fall back to static pickup map
      if (pickupLat && pickupLng) {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/${style}/static/pin-s+ff0000(${pickupLng},${pickupLat})/${pickupLng},${pickupLat},15/${width}x${height}?access_token=${MAPBOX_TOKEN}`,
          isLive: false,
          reason: 'stale_data'
        }
      }
      return {
        url: fallbackMapUrl,
        isLive: false,
        reason: 'stale_data_no_fallback'
      }
    }

    // Use rounded coordinates to prevent unnecessary map regeneration
    const driverLat = driverCoords?.lat || driverLocation.latitude
    const driverLng = driverCoords?.lng || driverLocation.longitude
    
    console.log('🗺️ Generating live map with driver location:', {
      pickup: { lat: pickupLat, lng: pickupLng },
      driver: { lat: driverLat, lng: driverLng }
    })
    
    // Build markers array
    const markers: string[] = []
    
    // Add pickup location (red pin with label)
    if (pickupLat && pickupLng) {
      markers.push(`pin-s-p+ff0000(${pickupLng},${pickupLat})`)
    }
    
    // Add driver location (blue triangle/truck marker)
    markers.push(`pin-s-triangle+0080ff(${driverLng},${driverLat})`)
    
    // Add route path if available
    let pathParam = ''
    if (routeData && routeData.geometry) {
      // Mapbox Static API supports path overlay with encoded polyline
      pathParam = `,path-5+0080ff-0.5(${encodeURIComponent(routeData.geometry)})`
    }
    
    // Build the static map URL with route overlay
    const markersStr = markers.join(',')
    const liveUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${markersStr}${pathParam}/auto/${width}x${height}?access_token=${MAPBOX_TOKEN}`
    
    return {
      url: liveUrl,
      isLive: true,
      reason: 'live_tracking'
    }
  }, [
    pickupLat,
    pickupLng,
    driverLocation,
    lastUpdated,
    isTrackingEnabled,
    fallbackMapUrl,
    width,
    height,
    style,
    staleThresholdMinutes,
    routeData
  ])

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Format distance for display
  const formatDistance = (meters: number): string => {
    const km = meters / 1000
    if (km < 1) return `${Math.round(meters)} m`
    return `${km.toFixed(1)} km`
  }

  // No map URL available at all
  if (!mapData.url) {
    return (
      <div className={`bg-gray-100 rounded-lg border aspect-[2/1] flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">📍 Map not available</p>
          <p className="text-xs mt-1">
            {!pickupLat || !pickupLng 
              ? 'Coordinates not available for this address'
              : 'Mapbox token not configured'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`no-print rounded-lg overflow-hidden border relative w-full ${className}`}>
      {/* Map Image */}
      <div className="aspect-[2/1] relative w-full">
        <Image
          src={mapData.url}
          alt={mapData.isLive ? "Live Delivery Tracking" : "Pickup Map"}
          fill
          className="object-cover"
          key={mapData.url} // Force re-render when URL changes
          unoptimized // Required for dynamic Mapbox URLs
          priority
        />
        
        {/* Live tracking indicator */}
        {mapData.isLive && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Live Tracking
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            {mapData.reason}
          </div>
        )}
      </div>

      {/* ETA Display Panel */}
      {mapData.isLive && routeData && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200 p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Estimated Time of Arrival</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatDuration(routeData.duration)}
                </p>
                {lastRouteFetch > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Updates every 5 minutes
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Navigation className="w-4 h-4 text-gray-600" />
                <p className="text-xs text-gray-600 font-medium">Distance</p>
              </div>
              <p className="text-lg font-semibold text-gray-700">
                {formatDistance(routeData.distance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingRoute && mapData.isLive && (
        <div className="bg-blue-50 border-t border-blue-200 p-3">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Calculating route...</span>
          </div>
        </div>
      )}
    </div>
  )
}