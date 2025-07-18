'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

function generateTrackingId(prefix = 'TXT') {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${random}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const auth = useAuth()
  const user = auth?.user
  const role = auth?.role
  const authLoading = auth?.loading

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      
      if (role !== 'admin') {
        router.push('/dashboard')
        return
      }
      
      setLoadingAuth(false)
    }
  }, [user, role, authLoading, router])

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
    if (!email) {
      setEmailStatus('Please enter an email address.')
      return
    }

    setEmailStatus('Sending...')

    try {
      const { error } = await supabase.functions.invoke('send-tracking-email', {
        body: { email, trackingId: trackingId }
      })

      if (error) {
        setEmailStatus('Error sending email: ' + error.message)
      } else {
        setEmailStatus('Email sent successfully!')
        setEmail('')
      }
    } catch (err) {
      setEmailStatus('Error sending email.')
    }
  }

  if (loadingAuth || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-orange-500 text-xl font-semibold mb-4">🔐 Checking your access...</p>
        <div className="mt-4 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <main className="px-6 py-10 space-y-16 bg-[#f9fafb]">
      {/* 📊 Overview + ⚠️ Inventory Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Admin Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
                <h3 className="font-semibold">Total Orders</h3>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
                <h3 className="font-semibold">Active Drivers</h3>
                <p className="text-2xl font-bold">45</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
                <h3 className="font-semibold">Revenue</h3>
                <p className="text-2xl font-bold">$12,345</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold transition">
              📋 View All Orders
            </button>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold transition">
              👥 Manage Staff
            </button>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-semibold transition">
              📦 Inventory Check
            </button>
          </div>
        </div>
      </section>

      {/* 🎯 Generate Tracking ID */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Generate Tracking ID</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            {loading ? 'Generating...' : 'Generate New Tracking ID'}
          </button>

          {trackingId && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Generated Tracking ID:</p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-2 rounded border text-lg font-mono">
                  {trackingId}
                </code>
                <button
                  onClick={handleCopy}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {trackingId && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📧 Send Tracking ID via Email</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={handleSendEmail}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Send
                </button>
              </div>
              {emailStatus && (
                <p className="mt-2 text-sm text-blue-700">{emailStatus}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
