'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function FeedbackPage() {
  const params = useParams()
  const router = useRouter()
  const trackingId = params.trackingId as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    overallRating: 0,
    driverRating: 0,
    timelinessRating: 0,
    communicationRating: 0,
    comments: '',
    suggestions: '',
    wouldRecommend: true
  })

  useEffect(() => {
    if (trackingId) {
      fetchOrderDetails()
    }
  }, [trackingId])

  const fetchOrderDetails = async () => {
    try {
      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from('order_feedback')
        .select('*')
        .eq('tracking_id', trackingId)
        .maybeSingle()
      
      if (existingFeedback) {
        setSubmitted(true)
        setLoading(false)
        return
      }

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          clients (*)
        `)
        .eq('tracking_id', trackingId)
        .single()
      
      if (orderError) throw orderError
      
      if (orderData.status !== 'delivered') {
        setError('This order has not been delivered yet.')
      } else {
        setOrder(orderData)
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Order not found or unable to load details.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (formData.overallRating === 0) {
      alert('Please provide an overall rating')
      return
    }

    setSubmitting(true)

    try {
      const { error: insertError } = await supabase
        .from('order_feedback')
        .insert({
          order_id: order.id,
          tracking_id: trackingId,
          client_email: order.clients.email,
          client_name: order.clients.contact_person,
          overall_rating: formData.overallRating,
          driver_rating: formData.driverRating || null,
          timeliness_rating: formData.timelinessRating || null,
          communication_rating: formData.communicationRating || null,
          comments: formData.comments || null,
          suggestions: formData.suggestions || null,
          would_recommend: formData.wouldRecommend
        })

      if (insertError) throw insertError

      console.log('✅ Feedback submitted successfully')
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ rating, onChange, label }: { rating: number; onChange: (r: number) => void; label: string }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-3xl transition-all transform hover:scale-110"
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your experience!
          </p>
          <button
            onClick={() => router.push(`/track/${trackingId}`)}
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            View Order Details
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">💭</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Share Your Feedback</h1>
            <p className="text-gray-600">Help us improve our service</p>
          </div>

          {/* Order Info */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order Tracking ID</p>
            <p className="text-xl font-bold text-orange-600 font-mono">{trackingId}</p>
            {order?.clients && (
              <p className="text-sm text-gray-600 mt-2">
                Customer: {order.clients.contact_person}
              </p>
            )}
          </div>
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div>
            {/* Overall Rating */}
            <StarRating
              rating={formData.overallRating}
              onChange={(rating) => setFormData({ ...formData, overallRating: rating })}
              label="Overall Experience *"
            />

            {/* Driver Rating */}
            <StarRating
              rating={formData.driverRating}
              onChange={(rating) => setFormData({ ...formData, driverRating: rating })}
              label="Driver Service"
            />

            {/* Timeliness Rating */}
            <StarRating
              rating={formData.timelinessRating}
              onChange={(rating) => setFormData({ ...formData, timelinessRating: rating })}
              label="Timeliness"
            />

            {/* Communication Rating */}
            <StarRating
              rating={formData.communicationRating}
              onChange={(rating) => setFormData({ ...formData, communicationRating: rating })}
              label="Communication"
            />

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us about your experience..."
              />
            </div>

            {/* Suggestions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggestions for Improvement
              </label>
              <textarea
                value={formData.suggestions}
                onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="How can we serve you better?"
              />
            </div>

            {/* Would Recommend */}
            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.wouldRecommend}
                  onChange={(e) => setFormData({ ...formData, wouldRecommend: e.target.checked })}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-gray-700 font-medium">
                  I would recommend Thaumazo Logistics to others
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || formData.overallRating === 0}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              * Required field
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}