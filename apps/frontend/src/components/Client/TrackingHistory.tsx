'use client'

import { useEffect } from 'react'

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
      <h2 className="font-semibold text-lg mb-3">Tracking History</h2>

      <div className="space-y-4">
        {hardcodedLogs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 border-b pb-2">
            <p className="text-sm text-gray-600">
              📅 <strong>{new Date(log.timestamp).toLocaleString('en-US')}</strong>
            </p>
            <p className="text-sm text-gray-800">
              📝 {log.description || log.status.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onViewRoute}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          📍 View Route
        </button>
        <button
          onClick={onDownloadReport}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          📄 Download Report
        </button>
      </div>
    </div>
  )
}
