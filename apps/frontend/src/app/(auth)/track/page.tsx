'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!trackingId.trim()) {
      setError('Please enter a tracking ID.')
      return
    }

    try {
      const res = await fetch(`/api/check-tracking?trackingId=${encodeURIComponent(trackingId)}`)
      const result = await res.json()

      if (result.exists) {
        router.push(`/track/${trackingId}`)
      } else {
        router.push(`/create-order/${trackingId}`)
      }
    } catch (err) {
      console.error('Tracking check failed:', err)
      setError('An error occurred while checking your tracking ID. Please try again.')
    }
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-gray-800">
          📦 Track Your Delivery
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="trackingId" className="sr-only">Tracking ID</label>
        <input
          id="trackingId"
          type="text"
          placeholder="Enter Tracking ID"
          value={trackingId}
          onChange={e => setTrackingId(e.target.value)}
          className="w-full p-2 border rounded"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded"
        >
          Track
        </button>

        <p className="text-sm text-center text-gray-500">
          Not a client? 
          <Link href="/login" className="text-orange-500 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  )
}
