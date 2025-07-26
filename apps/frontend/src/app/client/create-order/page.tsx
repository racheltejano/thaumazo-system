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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientProfile, setClientProfile] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
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
        setLoading(false)
      } catch (err) {
        console.error('Error in client order creation:', err)
        setError('Failed to initialize order creation. Please try again.')
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

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
          <p className="text-gray-700">Fill out the form below to create your order. Your tracking ID will be generated when you submit the order.</p>
        </div>

        <ClientOrderForm clientProfile={clientProfile} />
      </div>
    </ClientDashboardLayout>
  )
} 