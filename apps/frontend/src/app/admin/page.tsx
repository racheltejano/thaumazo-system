'use client'
import DashboardLayout from '@/components/DashboardLayout'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

function generateTrackingId(prefix = 'TXT') {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${random}`
}

export default function AdminDashboard() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopied(false)
    setEmail('')
    setEmailStatus('')

    const id = generateTrackingId()

    const { error } = await supabase.from('clients').insert({
      tracking_id: id,
      contact_person: 'Pending',
      contact_number: 'Pending',
      pickup_address: 'Pending',
    })

    if (error) {
      setError(error.message)
    } else {
      setTrackingId(id)
    }

    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    setEmailStatus('Sending...')
    try {
      const res = await fetch('/api/send-tracking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trackingId }),
      })
      const result = await res.json()
      if (result.success) {
        setEmailStatus('✅ Email sent successfully!')
      } else {
        setEmailStatus('❌ Failed to send email.')
      }
    }  catch (e) {
      console.error(e)
      setEmailStatus('❌ An error occurred while sending.')
    }
  }

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-orange-600 mb-4">🎯 Generate Tracking ID</h1>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded"
        >
          {loading ? 'Generating...' : 'Generate ID'}
        </button>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        {trackingId && (
          <div className="mt-6">
            <p className="text-lg font-semibold text-gray-700">Tracking ID:</p>
            <div className="flex items-center space-x-2 mt-2">
              <code className="bg-gray-100 border px-3 py-1 rounded text-orange-700 font-semibold">{trackingId}</code>
              <button
                onClick={handleCopy}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Email Section */}
            <div className="mt-8 border-t pt-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2">📨 Send Tracking ID to Client</h2>
              <input
                type="email"
                placeholder="Client email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded mb-2"
              />
              <button
                onClick={handleSendEmail}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded"
              >
                Send Email
              </button>
              {emailStatus && <p className="text-sm mt-2 text-gray-600">{emailStatus}</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
