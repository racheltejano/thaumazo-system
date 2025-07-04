'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EnterTrackingIdPage() {
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!trackingId.trim()) {
      setError('Please enter a valid Tracking ID.')
      setLoading(false)
      return
    }

    try {
      // Check if an order with this tracking ID already exists
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id, status, created_at, client_id')
        .eq('tracking_id', trackingId.trim())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - which is what we want
        setError('Unable to verify tracking ID. Please try again.')
        setLoading(false)
        return
      }

      if (existingOrder) {
        // Order already exists - show error
        setError(`⚠️ Your order is already being tracked! Order was placed on ${new Date(existingOrder.created_at).toLocaleDateString()} with status: ${existingOrder.status.replace('_', ' ').toUpperCase()}`)
        setLoading(false)
        return
      }

      // No existing order found - proceed to create order page
      router.push(`/create-order/${trackingId.trim()}`)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">📦 Enter Tracking ID</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter your Tracking ID"
          value={trackingId}
          onChange={e => setTrackingId(e.target.value)}
          className="w-full border p-2 rounded"
          disabled={loading}
        />
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Checking...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </main>
  )
}