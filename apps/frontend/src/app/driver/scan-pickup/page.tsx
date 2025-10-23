// app/driver/scan-pickup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRScanner from '@/components/Driver/QRScanner'
import { CheckCircle, Package, QrCode } from 'lucide-react'

export default function DriverScanPickupPage() {
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [driverName, setDriverName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [recentScans, setRecentScans] = useState<Array<{
    orderId: string
    trackingId: string
    timestamp: string
  }>>([])

  useEffect(() => {
    checkAuth()
    loadRecentScans()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login?redirect=/driver/scan-pickup')
      return
    }

    // Get driver profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      console.error('Failed to load profile:', error)
      router.push('/login')
      return
    }

    if (profile.role !== 'driver') {
      alert('This page is only accessible to drivers')
      router.push('/')
      return
    }

    setDriverId(profile.id)
    setDriverName(`${profile.first_name} ${profile.last_name}`)
    setLoading(false)
  }

  const loadRecentScans = async () => {
    // Load recent pickups confirmed by this driver
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: logs } = await supabase
      .from('order_status_logs')
      .select(`
        order_id,
        timestamp,
        orders!inner(tracking_id, driver_id)
      `)
      .eq('status', 'items_being_delivered')
      .eq('orders.driver_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(5)

    if (logs) {
      setRecentScans(logs.map(log => ({
        orderId: log.order_id,
        trackingId: (log.orders as any).tracking_id,
        timestamp: log.timestamp
      })))
    }
  }

  const handleScanSuccess = (orderId: string) => {
    setShowScanner(false)
    loadRecentScans()
    
    // Show success message
    setTimeout(() => {
      alert('✅ Pickup confirmed! Status updated to "Items Being Delivered"')
      // Optionally redirect to driver dashboard or order details
      // router.push(`/driver/orders/${orderId}`)
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pickup Confirmation</h1>
              <p className="text-sm text-gray-600">Driver: {driverName}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📝 How to confirm pickup:
            </p>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Arrive at the pickup location</li>
              <li>2. Update your status to "Arrived at Pickup"</li>
              <li>3. Ask client to show you their pickup QR code</li>
              <li>4. Scan the QR code using the button below</li>
              <li>5. Status will automatically change to "Items Being Delivered"</li>
              <li>6. Live tracking will switch to first dropoff location</li>
            </ol>
          </div>
        </div>

        {/* Scan Button */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <button
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-lg transition transform hover:scale-105 shadow-lg"
          >
            <QrCode className="w-8 h-8" />
            <span className="text-xl">Scan Pickup QR Code</span>
          </button>
        </div>

        {/* QR Scanner */}
        {showScanner && (
          <QRScanner onScanSuccess={handleScanSuccess} />
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recent Pickups Confirmed
            </h2>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{scan.trackingId}</p>
                    <p className="text-xs text-gray-500">{scan.timestamp}</p>
                  </div>
                  <span className="text-sm text-gray-600">Order ID: {scan.orderId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
