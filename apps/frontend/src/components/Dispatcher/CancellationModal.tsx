import { useState } from 'react'
import { getManualCancellationReasons, type CancellationReasonKey } from './cancellationConfig'

interface CancellationModalProps {
  orderId: string
  trackingId: string
  onClose: () => void
  onConfirm: (reason: CancellationReasonKey, customMessage?: string) => Promise<void>
}

export function CancellationModal({ 
  orderId, 
  trackingId, 
  onClose, 
  onConfirm 
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReasonKey | ''>('')
  const [customMessage, setCustomMessage] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const reasons = getManualCancellationReasons()

  const handleConfirm = async () => {
    if (!selectedReason) {
      alert('Please select a cancellation reason')
      return
    }

    if (selectedReason === 'other' && !customMessage.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    setCancelling(true)
    try {
      await onConfirm(selectedReason, customMessage.trim() || undefined)
    } catch (error) {
      console.error('Cancellation failed:', error)
    } finally {
      setCancelling(false)
    }
  }

  const showCustomMessageInput = selectedReason === 'other'

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-red-800">❌ Cancel Order</h3>
          <p className="text-sm text-red-600 mt-1">
            Tracking ID: <span className="font-semibold">{trackingId}</span>
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ This will cancel the order and send a cancellation email to the client with an option to reschedule.
            </p>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason *
            </label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value as CancellationReasonKey | '')
                setCustomMessage('') // Reset custom message when changing reason
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={cancelling}
            >
              <option value="">Select a reason...</option>
              {reasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Message (only for "Other") */}
          {showCustomMessageInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify the reason *
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Explain why this order is being cancelled..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                disabled={cancelling}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
          <button
            onClick={handleConfirm}
            disabled={cancelling || !selectedReason || (selectedReason === 'other' && !customMessage.trim())}
            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}