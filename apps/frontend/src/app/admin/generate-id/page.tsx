'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

function generateTrackingId(prefix = 'TXT') {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${random}`
}

export default function GenerateTrackingIdPage() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopied(false)

    const id = generateTrackingId()

    // Insert minimal row with just tracking ID (contact info will be added later)
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

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">🎯 Generate Tracking ID</h1>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Generating...' : 'Generate ID'}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {trackingId && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <p className="text-lg font-semibold">Tracking ID:</p>
          <div className="flex items-center space-x-2 mt-2">
            <code className="bg-white px-3 py-1 border rounded">{trackingId}</code>
            <button
              onClick={handleCopy}
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
