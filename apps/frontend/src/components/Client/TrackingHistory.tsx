'use client'
import { useState, useEffect } from 'react'
import { Download, MapPin, MoreHorizontal } from 'lucide-react'
import { Clock } from 'lucide-react'
import ReactQRCode from 'react-qr-code'  // Importing the new library
import { generatePickupQRData } from '@/lib/qrCodeUtils' // Assuming you have this utility

type Log = {
  id: string
  order_id: string
  status: string
  description: string | null
  timestamp: string
}

type TrackingHistoryProps = {
  logs: Log[] // <-- Accept logs from parent
  onViewRoute: () => void
  onDownloadReport: () => void
  orderId: string // Pass the orderId to generate the QR code
}

function getFriendlyDescription(log: Log): string {
  if (log.description && !log.description.includes('automatically by trigger')) {
    return log.description
  }

  switch (log.status) {
    case 'order_placed':
      return 'Client filled out the order form'
    case 'driver_assigned':
      return 'A driver has been successfully assigned to your order'
    case 'driver_on_the_way':
      return 'The driver is on the way to pick up your package'
    case 'driver_arrived':
      return 'The driver has arrived at the pickup location'
    case 'picked_up':
      return 'The package has been picked up'
    case 'in_transit':
      return 'The package is currently in transit'
    case 'arrived_at_dropoff':
      return 'The driver has arrived at the drop-off location'
    case 'delivered':
      return 'The package has been successfully delivered'
    case 'failed_delivery':
      return 'Delivery attempt failed. Please contact support.'
    case 'cancelled':
      return 'This order was cancelled'
    case 'rescheduled':
      return 'The delivery has been rescheduled'
    case 'returned_to_sender':
      return 'The package was returned to the sender'
    default:
      return log.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // fallback: e.g. “In Transit”
  }
}

export default function TrackingHistory({
  logs,
  onViewRoute,
  onDownloadReport,
  orderId, // New prop for orderId
}: TrackingHistoryProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null) // State for QR code

  // Generate the QR code when the button is clicked
  const handleGenerateQRCode = async () => {
    const qrData = await generatePickupQRData(orderId)
    setQrCodeData(qrData)
  }

  useEffect(() => {
    console.log('[TrackingHistory.tsx] Received logs from parent:', logs)
  }, [logs])

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <h2 className="font-semibold text-lg mb-6">📦 Tracking History</h2>

      {logs.length === 0 ? (
        <p className="text-sm italic text-gray-500">No tracking updates yet for this order.</p>
      ) : (
        <div className="relative border-l-2 border-orange-400 pl-6 space-y-6">
          {logs.map((log) => (
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
                <span className="font-medium">{getFriendlyDescription(log)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="mt-8 flex justify-end gap-3 relative">
        {/* Primary Buttons */}
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

        {/* Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(prev => !prev)}
            className="flex items-center gap-2 bg-neutral-200 hover:bg-neutral-300 text-gray-800 px-4 py-2 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
            More Actions
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-50 w-56">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleGenerateQRCode();
                  console.log('QR Code button clicked!');
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                📲 Confirm Pickup via QR Code
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false)
                  alert('Reschedule request form coming soon!')
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                🗓️ Request Reschedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {qrCodeData && (
        <div className="mt-8 p-5 bg-white rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-3">Pickup Confirmation QR Code</h2>
          <ReactQRCode value={qrCodeData} size={256} />
        </div>
      )}
    </div>
  )
}
