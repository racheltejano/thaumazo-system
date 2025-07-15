'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  // Animation state
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(true)
  }, [])

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

      if (!result.exists) {
        setError('Tracking ID not found.')
        return
      }

      if (result.hasOrder) {
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
    <div className="min-h-[80vh] flex items-center justify-center bg-white relative overflow-hidden px-4">
      <div
        className="w-full bg-white rounded-2xl p-10 track-form-card relative z-10 mx-auto"
        style={{
          maxWidth: 600,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18), 0 1.5px 6px 0 rgba(60,60,60,0.10)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)'
        }}
      >
        <div className="flex flex-col items-center mb-6">
          {/* Removed icon */}
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Track Your Delivery</h2>
          <p className="text-gray-500 text-base">Enter your tracking ID to see your order status.</p>
        </div>
        <hr className="my-4 border-gray-200" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="trackingId" className="sr-only">Tracking ID</label>
          <input
            id="trackingId"
            type="text"
            placeholder="Enter Tracking ID"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition sectiona-btn"
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full max-w-[180px] mx-auto block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition-all duration-200 track-btn"
            style={{ fontSize: 18 }}
          >
            Track
          </button>

          <div className="pt-4 text-sm text-center text-gray-500 flex flex-col items-center gap-1">
            <span>Not a client? {" "}
              <Link href="/login" className="text-orange-500 hover:underline font-medium">
                Back to login
              </Link>
            </span>
          </div>
        </form>
        <style jsx>{`
          .sectiona-btn {
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out !important;
          }
          .sectiona-btn:focus, .sectiona-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          }
          .track-btn {
            width: 180px;
            margin-left: auto;
            margin-right: auto;
            transition: background 0.15s, color 0.15s, filter 0.2s;
          }
          .track-btn:hover {
            filter: brightness(0.92);
          }
        `}</style>
      </div>
    </div>
  )
} 