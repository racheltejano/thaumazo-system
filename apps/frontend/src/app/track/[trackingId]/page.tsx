'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function TrackingPage() {
  const { trackingId } = useParams()
  const [orderData, setOrderData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTracking = async () => {
      // TODO: Replace with actual Supabase fetch
      await new Promise(res => setTimeout(res, 1000))
      setOrderData({
        trackingId,
        status: 'ARRIVED AT PICKUP AREA',
        timeline: [
          { time: '7:00 AM', date: 'July 10, 2025', label: 'Order Placed' },
          { time: '7:30 AM', date: 'July 10, 2025', label: 'Driver Accepted Assignment' },
          { time: '9:00 AM', date: 'July 20, 2025', label: 'Truck Left Warehouse for Pickup' },
          { time: '9:30 AM', date: 'July 20, 2025', label: 'Driver Received Items' },
        ],
      })
      setLoading(false)
    }

    fetchTracking()
  }, [trackingId])

  if (loading) return <p className="p-6 text-gray-700">Loading tracking details...</p>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Tracking ID: {orderData.trackingId}</h1>
      <p className="text-green-700 font-semibold mb-6">STATUS: {orderData.status}</p>

      <div className="space-y-4 bg-white p-4 rounded shadow">
        {orderData.timeline.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-4">
            <div className="text-right w-32 text-sm text-gray-600">
              <p>{entry.date}</p>
              <p>{entry.time}</p>
            </div>
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
            <div className="text-gray-800">{entry.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
