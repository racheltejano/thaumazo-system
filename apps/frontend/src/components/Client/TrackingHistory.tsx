'use client'

import { useEffect } from 'react'
import { Clock, MapPin, Download } from 'lucide-react'

type Log = {
  id: string
  order_id: string
  status: string
  description: string | null
  timestamp: string
}

type TrackingHistoryProps = {
  onViewRoute: () => void
  onDownloadReport: () => void
}

export default function TrackingHistory({
  onViewRoute,
  onDownloadReport,
}: TrackingHistoryProps) {
  const hardcodedLogs: Log[] = [
    {
      id: '1',
      order_id: 'ORDER123',
      status: 'order_received',
      description: 'Order has been received',
      timestamp: '2025-07-13T08:00:00Z',
    },
    {
      id: '2',
      order_id: 'ORDER123',
      status: 'driver_assigned',
      description: 'Driver John D. has been assigned',
      timestamp: '2025-07-13T09:00:00Z',
    },
    {
      id: '3',
      order_id: 'ORDER123',
      status: 'picked_up',
      description: 'Package picked up at warehouse',
      timestamp: '2025-07-13T10:30:00Z',
    },
    {
      id: '4',
      order_id: 'ORDER123',
      status: 'in_transit',
      description: 'En route to dropoff location',
      timestamp: '2025-07-13T11:00:00Z',
    },
    {
      id: '5',
      order_id: 'ORDER123',
      status: 'delivered',
      description: 'Package successfully delivered',
      timestamp: '2025-07-13T11:45:00Z',
    },
  ]

  useEffect(() => {
    console.log('[TrackingHistory.tsx] Using hardcoded logs:', hardcodedLogs)
  }, [])

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <h2 className="font-semibold text-lg mb-6">📦 Tracking History</h2>

      <div className="relative border-l-2 border-orange-400 pl-6 space-y-6">
        {hardcodedLogs.map((log, index) => (
          <div key={log.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-3 top-1.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow"></div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              {new Date(log.timestamp).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>

            {/* Description */}
            <div className="mt-1 text-sm text-gray-800 flex items-start gap-2">
              <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium uppercase">
                {log.status.replace(/_/g, ' ')}
              </span>
              <span className="font-medium">{log.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onViewRoute}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <MapPin className="w-4 h-4" />
          View Route
        </button>
        <button
          onClick={onDownloadReport}
          className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>
    </div>
  )
}
