'use client'
import { useDrag } from 'react-dnd'

type Client = {
  tracking_id: string
  business_name: string | null
  contact_person: string
}

type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  special_instructions: string
  vehicle_type: string | null
  tail_lift_required: boolean | null
  tracking_id: string | null
  estimated_total_duration: number | null
  dropoff_count: number
  clients: Client | null
}

export default function DraggableOrder({
  order,
  onClick,
}: {
  order: Order
  onClick?: () => void
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'order',
    item: order,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  // Format estimated duration
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Get tracking ID (prefer client's tracking_id, fallback to order's tracking_id)
  const trackingId = order.clients?.tracking_id || order.tracking_id || 'N/A'

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border border-gray-200 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Tracking ID Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-blue-600">
          {trackingId}
        </h3>
        {order.vehicle_type && (
          <span className="text-xs text-gray-500">🚚 {order.vehicle_type}</span>
        )}
      </div>

      {/* Business Name */}
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">
            {order.clients?.business_name || 'Unknown Business'}
          </span>
        </p>
      </div>

      {/* Point of Contact */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">Point of Contact:</p>
        <p className="text-sm font-medium text-gray-700">
          {order.clients?.contact_person || 'N/A'}
        </p>
      </div>

      {/* Scheduled Pick-up Date */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">Scheduled Pick-up Date:</p>
        <p className="text-sm font-medium text-gray-700">
          🕒 {order.pickup_date} at {order.pickup_time}
        </p>
      </div>

      {/* Number of Dropoffs */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">No. of Dropoffs:</p>
        <p className="text-sm font-medium text-gray-700">
          📍 {order.dropoff_count} {order.dropoff_count === 1 ? 'location' : 'locations'}
        </p>
      </div>

      {/* Estimated Travel Time */}
      <div className="mb-2">
        <p className="text-xs text-gray-500">Estimated Travel Time:</p>
        <p className="text-sm font-medium text-gray-700">
          ⏱️ {formatDuration(order.estimated_total_duration)}
        </p>
      </div>

      {/* Tail Lift (if required) */}
      {order.tail_lift_required && (
        <div className="mb-2">
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
            ⬆️ Tail Lift Required
          </span>
        </div>
      )}

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">Special Instructions:</p>
          <p className="text-sm italic text-gray-600 mt-1">
            "{order.special_instructions}"
          </p>
        </div>
      )}
    </div>
  )
}