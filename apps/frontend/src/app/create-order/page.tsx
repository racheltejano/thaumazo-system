'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnterTrackingIdPage() {
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingId.trim()) {
      setError('Please enter a valid Tracking ID.')
      return
    }

    // Redirect to /create-order/[trackingId]
    router.push(`/create-order/${trackingId.trim()}`)
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
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Continue
        </button>
      </form>
    </main>
  )
}
