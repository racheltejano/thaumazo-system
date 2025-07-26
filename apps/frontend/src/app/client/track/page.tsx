'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import ClientDashboardLayout from '@/components/ClientDashboardLayout'
import Link from 'next/link'
import { Package, Clock, MapPin, Eye, Calendar } from 'lucide-react'

interface Order {
  id: string
  tracking_id: string
  status: string
  pickup_address: string
  created_at: string
  pickup_timestamp: string
  vehicle_type: string
  estimated_cost: number
  dropoff_count: number
  driver_name?: string
}

export default function ClientTrackPage() {
  const router = useRouter()
  const auth = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/client/login')
          return
        }

        // Get client profile
        const { data: profile, error: profileError } = await supabase
          .from('client_profiles')
          .select('id, contact_number')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          router.push('/client/complete-profile')
          return
        }

        // Get client record
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('contact_number', profile.contact_number)
          .single()

        if (clientError || !client) {
          setOrders([])
          setLoading(false)
          return
        }

        // Get orders for this client
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            tracking_id,
            status,
            created_at,
            pickup_timestamp,
            vehicle_type,
            estimated_cost,
            driver_id,
            clients!inner (
              pickup_address
            ),
            profiles (
              first_name,
              last_name
            )
          `)
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })

        if (ordersError) {
          setError('Failed to load orders')
          setLoading(false)
          return
        }

        // Get dropoff counts for each order
        const ordersWithDropoffs = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { count: dropoffCount } = await supabase
              .from('order_dropoffs')
              .select('*', { count: 'exact', head: true })
              .eq('order_id', order.id)

            return {
              id: order.id,
              tracking_id: order.tracking_id || `ORD-${order.id.slice(-6)}`,
              status: order.status,
              pickup_address: (order.clients as any)?.pickup_address || 'N/A',
              created_at: order.created_at,
              pickup_timestamp: order.pickup_timestamp,
              vehicle_type: order.vehicle_type,
              estimated_cost: order.estimated_cost,
              dropoff_count: dropoffCount || 0,
              driver_name: order.profiles ? `${(order.profiles as any).first_name} ${(order.profiles as any).last_name}` : undefined,
            }
          })
        )

        setOrders(ordersWithDropoffs)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError('Failed to load orders')
        setLoading(false)
      }
    }

    fetchOrders()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'order_placed':
        return 'bg-blue-100 text-blue-800'
      case 'driver_assigned':
        return 'bg-yellow-100 text-yellow-800'
      case 'truck_left_warehouse':
        return 'bg-orange-100 text-orange-800'
      case 'arrived_at_pickup':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    )
  }

  return (
    <ClientDashboardLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Orders</h1>
          <p className="text-gray-600">Monitor the status of your delivery orders</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-500 mb-6">You haven't created any orders yet.</p>
            <Link
              href="/client/create-order"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Package className="w-5 h-5" />
              Create Your First Order
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.tracking_id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        {order.pickup_address}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Created: {formatDate(order.created_at)}
                        </span>
                        {order.pickup_timestamp && (
                          <span>
                            <Clock className="w-4 h-4 inline mr-1" />
                            Pickup: {formatDate(order.pickup_timestamp)} at {formatTime(order.pickup_timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/client/track/${order.tracking_id}`}
                      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-medium text-gray-900">{order.vehicle_type || 'N/A'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Drop-offs</p>
                      <p className="font-medium text-gray-900">{order.dropoff_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Estimated Cost</p>
                      <p className="font-medium text-gray-900">₱{order.estimated_cost?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="font-medium text-gray-900">{order.driver_name || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/client/create-order"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Package className="w-5 h-5" />
                Create New Order
              </Link>
            </div>
          </>
        )}
      </div>
    </ClientDashboardLayout>
  )
} 