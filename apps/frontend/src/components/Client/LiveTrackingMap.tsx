// components/Client/LiveTrackingMap.tsx
'use client'

import { useMemo } from 'react'
import Image from 'next/image'

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
  staleThresholdMinutes = 5
}: LiveTrackingMapProps) {
  
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

    const driverLat = driverLocation.latitude
    const driverLng = driverLocation.longitude
    
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
    
    // Build the static map URL
    const markersStr = markers.join(',')
    const liveUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${markersStr}/auto/${width}x${height}?access_token=${MAPBOX_TOKEN}`
    
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
    staleThresholdMinutes
  ])

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
    <div className={`no-print rounded-lg overflow-hidden border aspect-[2/1] relative w-full ${className}`}>
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
  )
}