'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import ClientDashboardLayout from '@/components/ClientDashboardLayout'

interface ClientData {
  id: string
  tracking_id: string
  business_name: string
  client_type: string
  created_at: string
}

interface ClientContact {
  id: string
  name: string
  phone: string
  email: string
  role: string
  is_primary: boolean
}

interface ClientAddress {
  id: string
  label: string
  address_line1: string
  city: string
  is_pickup_address: boolean
}

export default function ClientDashboard() {
  const router = useRouter()
  const auth = useAuth()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [primaryContact, setPrimaryContact] = useState<ClientContact | null>(null)
  const [primaryAddress, setPrimaryAddress] = useState<ClientAddress | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const quickActionsRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickActionsRef.current && 
        !quickActionsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowQuickActions(false);
      }
    };

    if (showQuickActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickActions]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/client/login')
        return
      }

      // Check if user has a client profile
      const { data: clientProfile, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !clientProfile) {
        // User doesn't have a client profile yet
        if (user.email_confirmed_at) {
          router.push('/client/complete-profile')
        } else {
          router.push('/client/confirm-email')
        }
        return
      }

      // Using client_profiles directly for user data
      setClientData({
        id: clientProfile.id,
        tracking_id: 'N/A', // Will be set when client account is created
        business_name: `${clientProfile.first_name} ${clientProfile.last_name}`,
        client_type: 'first_time',
        created_at: clientProfile.created_at
      })

      // Set primary contact from profile data
      setPrimaryContact({
        id: clientProfile.id,
        name: `${clientProfile.first_name} ${clientProfile.last_name}`,
        phone: clientProfile.contact_number || '',
        email: clientProfile.email || '',
        role: 'Primary Contact',
        is_primary: true
      })

      // For now, we don't have addresses linked yet
      setPrimaryAddress(null)

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/client/login')
  }

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    )
  }

  return (
    <ClientDashboardLayout>
      <div 
        className={`max-w-7xl mx-auto px-6 py-8 transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
        }`}
      >
        {/* Header with Quick Actions */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Dashboard</h1>
            <p className="text-gray-600">Track your orders and manage your account</p>
          </div>
          <div className="relative">
            <button 
              ref={buttonRef}
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Quick Actions
            </button>
            
            {/* Quick Actions Popup */}
            {showQuickActions && (
              <div 
                ref={quickActionsRef}
                className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[280px] z-50"
              >
                <div className="p-3 space-y-2">
                  <button 
                    onClick={() => {
                      setShowQuickActions(false)
                      router.push('/client/create-order')
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create New Order
                  </button>
                  <button 
                    onClick={() => {
                      setShowQuickActions(false)
                      router.push('/client/orders')
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 6h18M3 12h18M3 18h18" />
                    </svg>
                    Order History
                  </button>
                  <button 
                    onClick={() => {
                      setShowQuickActions(false)
                      router.push('/client/track')
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 12l2 2l4 -4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Track Orders
                  </button>
                  <button 
                    onClick={() => {
                      setShowQuickActions(false)
                      router.push('/client/settings')
                    }}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Update Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Client Information Card */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-orange-600">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{clientData?.business_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tracking ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">{clientData?.tracking_id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium capitalize">{clientData?.client_type?.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">
                    {clientData?.created_at ? new Date(clientData.created_at).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          {primaryContact && (
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-600">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Primary Contact</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryContact.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryContact.phone || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryContact.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryContact.role}</dd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Information Card */}
          {primaryAddress && (
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-600">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Primary Address</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Label</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryAddress.label}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryAddress.address_line1}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">City</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{primaryAddress.city}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">
                      {primaryAddress.is_pickup_address ? 'Pickup Address' : 'Regular Address'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientDashboardLayout>
  )
} 