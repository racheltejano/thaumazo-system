'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import ClientDashboardLayout from '@/components/ClientDashboardLayout'
import ClientOrderForm from './ClientOrderForm'

export default function ClientCreateOrderPage() {
  const router = useRouter()
  const auth = useAuth()
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientProfile, setClientProfile] = useState<any>(null)

  useEffect(() => {
    const checkAuthAndGenerateTrackingId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/client/login')
          return
        }

        // Get client profile
        const { data: profile, error: profileError } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          router.push('/client/complete-profile')
          return
        }

        setClientProfile(profile)

        // Generate tracking ID
        const generatedTrackingId = await generateTrackingId()
        setTrackingId(generatedTrackingId)
        setLoading(false)
      } catch (err) {
        console.error('Error in client order creation:', err)
        setError('Failed to initialize order creation. Please try again.')
        setLoading(false)
      }
    }

    checkAuthAndGenerateTrackingId()
  }, [router])

  const generateTrackingId = async (): Promise<string> => {
    // Generate a unique tracking ID
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const trackingId = `CLI-${timestamp}-${random}`

    // Check if tracking ID already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tracking_id', trackingId)
      .single()

    if (existingClient) {
      // If exists, generate a new one recursively
      return generateTrackingId()
    }

    return trackingId
  }

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Preparing your order form...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    )
  }

  if (error) {
    return (
      <ClientDashboardLayout>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push('/client/dashboard')}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ClientDashboardLayout>
    )
  }

  return (
    <ClientDashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Order</h1>
          <p className="text-gray-600">Fill out the form below to create your delivery order</p>
          
          {/* Tracking ID Display */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-blue-800">Your Tracking ID:</span>
              <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                {trackingId}
              </code>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              This tracking ID will be used to track your order throughout the delivery process.
            </p>
          </div>
        </div>

        <ClientOrderForm 
          trackingId={trackingId}
          clientProfile={clientProfile}
        />
      </div>
    </ClientDashboardLayout>
  )
} 