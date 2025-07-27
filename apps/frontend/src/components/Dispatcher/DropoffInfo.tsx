import { useState } from 'react'

type Dropoff = {
  id: string
  dropoff_name: string
  dropoff_address: string
  dropoff_contact: string
  dropoff_phone: string
  sequence: number
  latitude: number | null
  longitude: number | null
}

interface DropoffInfoProps {
  dropoffs: Dropoff[]
  mapboxToken: string | undefined
}

export function DropoffInfo({ dropoffs, mapboxToken }: DropoffInfoProps) {
  const [showDropoffMaps, setShowDropoffMaps] = useState<{[key: string]: boolean}>({})

  const toggleDropoffMap = (dropoffId: string) => {
    setShowDropoffMaps(prev => ({
      ...prev,
      [dropoffId]: !prev[dropoffId]
    }))
  }

  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
      <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-green-800">
        <span>📍</span> Dropoff Locations
      </h4>
      <div className="space-y-4">
        {dropoffs.map((dropoff) => (
          <div key={dropoff.id} className="text-sm border-b border-green-200 last:border-b-0 pb-3 last:pb-0">
            <div className="font-medium text-green-700">
              {dropoff.sequence}. {dropoff.dropoff_name}
            </div>
            <div className="text-green-600 mb-1">{dropoff.dropoff_address}</div>
            <div className="text-green-600 mb-2">{dropoff.dropoff_contact} - {dropoff.dropoff_phone}</div>
            
            {/* Map button for dropoff location */}
            {dropoff.latitude && dropoff.longitude && mapboxToken && (
              <button
                onClick={() => toggleDropoffMap(dropoff.id)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors flex items-center gap-1 mb-2"
              >
                <span>🗺️</span>
                {showDropoffMaps[dropoff.id] ? 'Hide Map' : 'Show Map'}
              </button>
            )}
            
            {/* Dropoff Location Map */}
            {showDropoffMaps[dropoff.id] && dropoff.latitude && dropoff.longitude && mapboxToken && (
              <div className="mt-2 rounded-lg overflow-hidden border border-green-300">
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-${dropoff.sequence}+00ff00(${dropoff.longitude},${dropoff.latitude})/${dropoff.longitude},${dropoff.latitude},14,0/400x200@2x?access_token=${mapboxToken}`}
                  alt={`Dropoff ${dropoff.sequence} Location Map`}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'block';
                    }
                  }}
                />
                <div className="hidden p-3 bg-red-50 text-red-600 text-sm text-center">
                  Map could not be loaded
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}