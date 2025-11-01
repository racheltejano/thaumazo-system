'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'

type Order = {
  id: string
  tracking_id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  vehicle_type: string | null
  tail_lift_required: boolean | null
  estimated_total_duration: number | null
  status: string
  client_id: string
  clients?: {
    tracking_id: string
    business_name: string | null
    contact_person: string
    email: string
  } | null
}

export default function RescheduleOrderPage() {
  const router = useRouter()
  const params = useParams()
  const trackingId = params?.trackingId as string // CHANGED from orderId

  // Helper: Convert PH time to UTC
  const phToUTC = (dateStr: string, timeStr: string): string => {
    const dt = new Date(`${dateStr}T${timeStr}+08:00`)
    return dt.toISOString()
  }

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('09:00')
  const [deliveryWindowStart, setDeliveryWindowStart] = useState('')
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [reason, setReason] = useState('')

  // Get minimum date (tomorrow in PH timezone)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const phTomorrow = new Date(tomorrow.getTime() + (8 * 60 * 60 * 1000))
    return phTomorrow.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetchOrder()
  }, [trackingId])

  const fetchOrder = async () => {
    try {
      // CHANGED: Query by tracking_id instead of id
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          tracking_id,
          pickup_date,
          pickup_time,
          delivery_window_start,
          delivery_window_end,
          special_instructions,
          vehicle_type,
          tail_lift_required,
          estimated_total_duration,
          status,
          client_id,
          clients!client_id (
            tracking_id,
            business_name,
            contact_person,
            email
          )
        `)
        .eq('tracking_id', trackingId) // CHANGED from .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      if (!data) {
        throw new Error('Order not found')
      }

      if (data.status !== 'cancelled' && data.status !== 'order_placed') {
        throw new Error('This order cannot be rescheduled')
      }

      setOrder(data)
      
      // Pre-fill form with existing data
      setPickupDate(data.pickup_date || getMinDate())
      setPickupTime(data.pickup_time || '09:00')
      setDeliveryWindowStart(data.delivery_window_start || '')
      setDeliveryWindowEnd(data.delivery_window_end || '')
      setSpecialInstructions(data.special_instructions || '')

    } catch (e: any) {
      console.error('Error fetching order:', e)
      setError(e.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Validation
      if (!pickupDate || !pickupTime) {
        throw new Error('Please select both pickup date and time')
      }

      if (!reason.trim()) {
        throw new Error('Please provide a reason for rescheduling')
      }

      // Check if selected date/time is in the future
      const selectedDateTime = new Date(`${pickupDate}T${pickupTime}+08:00`)
      const now = new Date()
      if (selectedDateTime < now) {
        throw new Error('Selected pickup time must be in the future')
      }

      // Convert PH time to UTC for storage
      const pickupTimestamp = phToUTC(pickupDate, pickupTime)
      
      const deliveryWindowStartTz = deliveryWindowStart 
        ? phToUTC(pickupDate, deliveryWindowStart)
        : null
      
      const deliveryWindowEndTz = deliveryWindowEnd
        ? phToUTC(pickupDate, deliveryWindowEnd)
        : null

      console.log('📅 Submitting reschedule request:', {
        orderId: order!.id,
        phDateTime: `${pickupDate} ${pickupTime}`,
        utcTimestamp: pickupTimestamp
      })

      // Update order
      const { error: updateErr } = await supabase
        .from('orders')
        .update({
          status: 'order_placed',
          driver_id: null,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          pickup_timestamp: pickupTimestamp,
          delivery_window_start: deliveryWindowStart || null,
          delivery_window_end: deliveryWindowEnd || null,
          delivery_window_start_tz: deliveryWindowStartTz,
          delivery_window_end_tz: deliveryWindowEndTz,
          special_instructions: specialInstructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', order!.id)

      if (updateErr) throw updateErr

      // Add status log
      await supabase.from('order_status_logs').insert({
        order_id: order!.id,
        status: 'order_placed',
        description: `Order rescheduled by client. New pickup: ${pickupDate} ${pickupTime} (PH Time). Reason: ${reason}`,
        timestamp: new Date().toISOString()
      })

      // Send email notification
      if (order?.clients?.email) {
        try {
          await fetch('/api/send-reschedule-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: order.clients.email,
              trackingId: order.tracking_id,
              contactPerson: order.clients.contact_person,
              pickupDate: pickupDate,
              pickupTime: pickupTime,
              reason: reason
            })
          })
        } catch (emailErr) {
          console.error('Failed to send email:', emailErr)
          // Don't fail the reschedule if email fails
        }
      }

      setSuccess(true)

    } catch (e: any) {
      console.error('Reschedule error:', e)
      setError(e.message || 'Failed to reschedule order')
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Order Rescheduled Successfully!
            </h2>
            <p className="text-gray-600 mb-2">
              Your order has been reopened and scheduled for:
            </p>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
              <p className="text-lg font-semibold text-green-800">
                📅 {new Date(pickupDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-lg font-semibold text-green-800">
                🕐 {pickupTime}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              A confirmation email has been sent to <strong>{order?.clients?.email}</strong>
            </p>
            <button
              onClick={() => router.push(`/track/${order?.tracking_id}`)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Track Your Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Reschedule Your Order
              </h1>
              <p className="text-gray-600">
                Tracking ID: <span className="font-mono font-semibold text-blue-600">
                  {order?.tracking_id}
                </span>
              </p>
            </div>
            <Calendar className="w-16 h-16 text-blue-600" />
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Important Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {order?.status === 'cancelled' && (
              <li>• Your order will change from "Cancelled" to "Order Placed"</li>
            )}
            <li>• A new driver will be assigned to your rescheduled order</li>
            <li>• All times are in Philippine Time (UTC+8)</li>
            <li>• Pickup must be scheduled at least 24 hours in advance</li>
          </ul>
        </div>

        {/* Current Order Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Order Details</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start">
              <span className="text-gray-600 w-32">Client:</span>
              <span className="font-medium text-gray-900">
                {order?.clients?.business_name || order?.clients?.contact_person || 'N/A'}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-600 w-32">Status:</span>
              <span className={`font-medium ${order?.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>
                {order?.status === 'cancelled' ? 'Cancelled' : 'Order Placed'}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-600 w-32">Original Pickup:</span>
              <span className="font-medium text-gray-900">
                {order?.pickup_date} at {order?.pickup_time}
              </span>
            </div>
            {order?.vehicle_type && (
              <div className="flex items-start">
                <span className="text-gray-600 w-32">Vehicle Type:</span>
                <span className="font-medium text-gray-900">{order.vehicle_type}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">New Schedule Details</h2>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Pickup Date & Time */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                New Pickup Date *
              </label>
              <input
                type="date"
                value={pickupDate}
                min={getMinDate()}
                onChange={(e) => setPickupDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                New Pickup Time (PH Time) *
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Delivery Window (Optional) */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Window Start (Optional)
              </label>
              <input
                type="time"
                value={deliveryWindowStart}
                onChange={(e) => setDeliveryWindowStart(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Window End (Optional)
              </label>
              <input
                type="time"
                value={deliveryWindowEnd}
                onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special instructions for the driver..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Reason for Rescheduling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rescheduling *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you're rescheduling this order..."
              rows={4}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be logged for our records
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !pickupDate || !pickupTime || !reason.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Reschedule Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}