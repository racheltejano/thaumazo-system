'use client'
import { useState, useEffect } from 'react'

/**
 * 📧 Send Client Email Page
 * 
 * This page lets admins send an email to a client inviting them to either:
 *  - Create a One-Time Order, or
 *  - Create an Account
 * 
 * 🧭 The tracking ID will now only be generated AFTER the client clicks
 *     the "One-Time Order" button in the email.
 * 
 * Path: /admin/generate-id
 */

export default function SendClientEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  // 📨 Handles sending the email through /api/send-client-email
  const handleSendEmail = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter a valid client email.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/send-client-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email.')
      }

      setSuccess('Client email sent successfully! 🎉')
      setEmail('')
    } catch (err: any) {
      console.error('Email send error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className={`p-6 transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 transform translate-y-0'
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Send Client Email</h1>
        <p className="text-gray-600">
          Send a one-time link for the client to create an order or register an account.
        </p>
      </div>

      <div className="flex flex-col space-y-3 max-w-md">
        <label htmlFor="email" className="font-medium text-gray-700">
          Client Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="client@example.com"
        />

        <button
          onClick={handleSendEmail}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Client Email'}
        </button>

        {error && <p className="text-red-600 mt-2">{error}</p>}
        {success && <p className="text-green-600 mt-2">{success}</p>}
      </div>
    </main>
  )
}
