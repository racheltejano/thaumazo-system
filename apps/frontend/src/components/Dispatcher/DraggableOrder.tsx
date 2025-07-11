'use client'

import { useDrag } from 'react-dnd'

type Client = {
  business_name: string | null
}

type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  special_instructions: string
  truck_type: string | null
  tail_lift_required: boolean | null
  client: Client | null
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

  return (
    <div
  ref={drag}
  onClick={onClick}
  className={`bg-white p-4 rounded-2xl border border-gray-200 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg ${
    isDragging ? 'opacity-50' : ''
  }`}
>
  {/* Order Header */}
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-gray-800">
      Order #{order.id}
    </h3>
    {order.truck_type && (
      <span className="text-xs text-gray-500">🚚 {order.truck_type}</span>
    )}
  </div>

  {/* Client Name */}
  <p className="text-sm text-gray-600 mb-1">
    📍 <span className="font-medium">{order.client?.business_name ?? 'Unknown Client'}</span>
  </p>

  {/* Pickup Info */}
  <p className="text-sm text-gray-600 mb-1">
    🕒 {order.pickup_date} at {order.pickup_time}
  </p>

  {/* Tail Lift (if required) */}
  {order.tail_lift_required && (
    <p className="text-sm text-gray-600 mb-1">⬆️ Tail Lift Required</p>
  )}

  {/* Special Instructions */}
  {order.special_instructions && (
    <p className="text-sm italic text-gray-500 mt-2">
      “{order.special_instructions}”
    </p>
  )}
</div>

  )
}
