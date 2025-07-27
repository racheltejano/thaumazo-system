import { useState } from 'react'

type Client = {
  tracking_id: string
  business_name: string
  contact_person: string
  contact_number: string
  email: string | null
  pickup_address: string
  landmark: string | null
  pickup_area: string | null
  pickup_latitude: number | null
  pickup_longitude: number | null
}

interface ClientInfoProps {
  client: Client
  mapboxToken: string | undefined
}

export function ClientInfo({ client, mapboxToken }: ClientInfoProps) {
  const [showPickupMap, setShowPickupMap] = useState(false)

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-blue-800">
        <span>👤</span> Client Information
      </h4>
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-blue-700">Business:</span>
          <div className="text-blue-900">{client.business_name}</div>
        </div>
        <div>
          <span className="font-medium text-blue-700">Contact:</span>
          <div className="text-blue-900">{client.contact_person}</div>
        </div>
        <div>
          <span className="font-medium text-blue-700">Phone:</span>
          <div className="text-blue-900">{client.contact_number}</div>
        </div>
        <div>
          <span className="font-medium text-blue-700">Pickup Address:</span>
          <div className="text-blue-900 mb-2">{client.pickup_address}</div>
          {/* Map button for pickup location */}
          {client.pickup_latitude && client.pickup_longitude && mapboxToken && (
            <button
              onClick={() => setShowPickupMap(!showPickupMap)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors flex items-center gap-1"
            >
              <span>🗺️</span>
              {showPickupMap ? 'Hide Map' : 'Show Map'}
            </button>
          )}
        </div>
        
        {/* Pickup Location Map */}
        {showPickupMap && client.pickup_latitude && client.pickup_longitude && mapboxToken && (
          <div className="mt-3 rounded-lg overflow-hidden border border-blue-300">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-p+ff0000(${client.pickup_longitude},${client.pickup_latitude})/${client.pickup_longitude},${client.pickup_latitude},14,0/400x200@2x?access_token=${mapboxToken}`}
              alt="Pickup Location Map"
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
    </div>
  )
}