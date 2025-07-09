// components/DraggableOrder.tsx

'use client'
import { useState } from 'react'
import { useDrag } from 'react-dnd'

type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  truck_type: string | null
  tail_lift_required: boolean | null
  client_name: string | null
  status: string
}

export default function DraggableOrder({ order }: { order: Order }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ORDER',
    item: order,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div
        ref={drag}
        onClick={() => setShowModal(true)}
        className={`bg-orange-100 rounded-md p-3 shadow-sm border border-orange-300 cursor-pointer hover:bg-orange-200 ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        <p className="text-sm font-medium text-gray-800">
          📦 Pickup: {order.pickup_date} @ {order.pickup_time}
        </p>
        <p className="text-xs text-gray-600">
          🚚 Truck: {order.truck_type || 'N/A'}
        </p>
        <p className="text-xs text-gray-600 truncate">
          🧾 {order.special_instructions?.slice(0, 50) || 'No instructions'}
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-xl shadow-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-3">Order #{order.id}</h2>
            <div className="space-y-2 text-sm text-gray-800">
              <p><strong>Pickup:</strong> {order.pickup_date} @ {order.pickup_time}</p>
              <p><strong>Truck Type:</strong> {order.truck_type || 'N/A'}</p>
              <p><strong>Tail Lift:</strong> {order.tail_lift_required ? 'Yes' : 'No'}</p>
              <p><strong>Instructions:</strong> {order.special_instructions || 'None'}</p>
              <p><strong>Delivery Window:</strong> {order.delivery_window_start || 'N/A'} – {order.delivery_window_end || 'N/A'}</p>
              <p><strong>Client:</strong> {order.client_name || 'Unknown'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
