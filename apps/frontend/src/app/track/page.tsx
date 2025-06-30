'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!trackingId) return setError('Please enter a tracking ID.')

    // Try to fetch the tracking ID
    const res = await fetch(`/api/check-tracking?trackingId=${trackingId}`)
    const result = await res.json()

    if (result.exists) {
      router.push(`/track/${trackingId}`)
    } else {
      router.push(`/create-order/${trackingId}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Track Your Delivery</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          placeholder="Enter Tracking ID"
          value={trackingId}
          onChange={e => setTrackingId(e.target.value)}
          className="w-full p-2 border rounded"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded"
        >
          Track
        </button>
      </form>
    </div>
  )
}
