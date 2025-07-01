'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

function generateTrackingId(prefix = 'TXT') {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${random}`
}

export default function GenerateTrackingId() {
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopied(false)

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

  return (
    <section className="p-6 border rounded-lg shadow bg-white max-w-lg mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">🎯 Generate Tracking ID</h2>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className=" text-white px-4 py-2 rounded  bg-orange-500 hover:bg-orange-600"
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
              className="px-2 py-1  bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
