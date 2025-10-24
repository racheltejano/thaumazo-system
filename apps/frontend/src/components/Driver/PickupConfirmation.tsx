'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Package, QrCode, X } from 'lucide-react'
import QRScanner from './QRScanner'
import { supabase } from '@/lib/supabase'

interface PickupConfirmationProps {
  driverId: string | null
  driverName: string
  onScanSuccess: (orderId: string) => void
}

export const PickupConfirmation = ({ driverId, driverName, onScanSuccess }: PickupConfirmationProps) => {
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recentScans, setRecentScans] = useState<Array<{
    orderId: string
    trackingId: string
    timestamp: string
  }>>([])

  useEffect(() => {
    if (driverId) {
      loadRecentScans()
    }
  }, [driverId])

  const loadRecentScans = async () => {
    if (!driverId) return

    const { data: logs, error } = await supabase
      .from('order_status_logs')
      .select(`
        order_id,
        timestamp,
        orders!inner(tracking_id, driver_id)
      `)
      .eq('status', 'items_being_delivered')
      .eq('orders.driver_id', driverId)
      .order('timestamp', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Failed to load recent scans:', error)
      return
    }

    if (logs) {
      setRecentScans(logs.map(log => ({
        orderId: log.order_id,
        trackingId: (log.orders as any).tracking_id,
        timestamp: new Date(log.timestamp).toLocaleString()
      })))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
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

        {!showScanner && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <button
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-lg transition transform hover:scale-105 shadow-lg"
            >
              <QrCode className="w-8 h-8" />
              <span className="text-xl">Scan Pickup QR Code</span>
            </button>
          </div>
        )}

        {showScanner && driverId && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">QR Code Scanner</h2>
              <button
                onClick={() => setShowScanner(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <QRScanner 
              onScanSuccess={onScanSuccess}
              driverId={driverId}
            />
          </div>
        )}

        {recentScans.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recent Pickups Confirmed
            </h2>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{scan.trackingId}</p>
                    <p className="text-xs text-gray-500">{scan.timestamp}</p>
                  </div>
                  <span className="text-xs text-gray-600 bg-green-100 px-2 py-1 rounded">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentScans.length === 0 && !showScanner && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">
              No pickups confirmed yet. Scan your first QR code to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
