'use client'
import { useState, useEffect } from 'react'
import { Download, MapPin, MoreHorizontal, X, AlertTriangle } from 'lucide-react'
import { Clock } from 'lucide-react'
import ReactQRCode from 'react-qr-code' 
import { useRouter } from 'next/navigation'
import { generatePickupQRData } from '@/lib/qrCodeUtils'
import { supabase } from '@/lib/supabase'

type Log = {
  id: string
  order_id: string
  status: string
  description: string | null
  timestamp: string
}

type TrackingHistoryProps = {
  logs: Log[] 
  onViewRoute: () => void
  onDownloadReport: () => void
  orderId: string 
  trackingId: string
  currentStatus: string
  driverId?: string | null
  clientEmail?: string
  clientName?: string
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
  orderId, 
  trackingId,
  currentStatus,  
  driverId,
  clientEmail,
  clientName,
}: TrackingHistoryProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null) // State for QR code
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [showReasonError, setShowReasonError] = useState(false)
  // Generate the QR code when the button is clicked
  const handleGenerateQRCode = async () => {
    const qrData = await generatePickupQRData(orderId)
    setQrCodeData(qrData)
  }

  const handleCancelOrder = async () => {
  // Validate reason
  if (!cancelReason.trim()) {
    setShowReasonError(true)
    return
  }

  setIsCancelling(true)
  try {
    // Release driver slot if driver was assigned
    if (driverId) {
      const { error: slotErr } = await supabase
        .from('driver_time_slots')
        .update({ status: 'available', order_id: null })
        .eq('order_id', orderId)
        .eq('driver_id', driverId)
      
      if (slotErr) throw slotErr
    }

    // Update order status to cancelled
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        driver_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Add status log
    const { error: logError } = await supabase
      .from('order_status_logs')
      .insert({
        order_id: orderId,
        status: 'cancelled',
        description: `Order cancelled by client. Reason: ${cancelReason}`,
        timestamp: new Date().toISOString()
      })

    if (logError) throw logError

    // Send cancellation email (no reason passed - uses client_request template)
    if (clientEmail) {
      await fetch('/api/send-cancellation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail,
          trackingId: trackingId,
          contactPerson: clientName,
          cancellationType: 'client_request'
          // Note: reason is stored in logs but not sent to email
        })
      })
    }

    // Refresh the page to show updated status
    window.location.reload()
  } catch (err) {
    console.error('Error cancelling order:', err)
    alert('Failed to cancel order. Please try again or contact support.')
  } finally {
    setIsCancelling(false)
  }
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
              {/* Only show if order_placed and no driver assigned */}
              {currentStatus.toLowerCase().replace(/ /g, '_') === 'order_placed' && !driverId && (
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push(`/reschedule/${trackingId}`)  
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  🗓️ Request Reschedule
                </button>
              )}
              {/* Cancel Order - Show for order_placed OR driver_assigned */}
              {['order_placed', 'driver_assigned'].includes(currentStatus.toLowerCase().replace(/ /g, '_')) && (
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    setShowCancelModal(true)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 hover:bg-red-50"
                >
                  ❌ Cancel Order
                </button>
              )}
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
      {/* Cancel Order Modal */}
{showCancelModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Cancel Order</h2>
        </div>
        <button
          onClick={() => {
            setShowCancelModal(false)
            setCancelReason('')
            setShowReasonError(false)
          }}
          disabled={isCancelling}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Warning:</strong> This action cannot be undone. Cancelling this order will:
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
            <li>Remove the assigned driver (if any)</li>
            <li>Mark the order as cancelled</li>
            <li>Send a cancellation notification email</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for cancellation <span className="text-red-600">*</span>
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value)
              setShowReasonError(false)
            }}
            disabled={isCancelling}
            placeholder="Please provide a reason for cancelling this order..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              showReasonError ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
          />
          {showReasonError && (
            <p className="mt-1 text-sm text-red-600">Please provide a reason for cancellation</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
        <button
          onClick={() => {
            setShowCancelModal(false)
            setCancelReason('')
            setShowReasonError(false)
          }}
          disabled={isCancelling}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Keep Order
        </button>
        <button
          onClick={handleCancelOrder}
          disabled={isCancelling}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
