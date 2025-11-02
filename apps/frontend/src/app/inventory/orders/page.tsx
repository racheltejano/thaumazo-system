'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
//import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { Package, Clock, MapPin, Eye, Calendar, Search, Download, XCircle } from 'lucide-react'

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
  contact_person: string
  contact_number: string
}

export default function InventoryOrdersPage() {
  const router = useRouter()
  const auth = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch orders created by this inventory staff user
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
              pickup_address,
              contact_person,
              contact_number
            ),
            profiles (
              first_name,
              last_name
            )
          `)
          .eq('created_by_user_id', user.id)
          .eq('order_source', 'inventory_staff')
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
              tracking_id: order.tracking_id || `ORD-${order.id.slice(-8)}`,
              status: order.status,
              pickup_address: (order.clients as any)?.pickup_address || 'N/A',
              contact_person: (order.clients as any)?.contact_person || 'N/A',
              contact_number: (order.clients as any)?.contact_number || 'N/A',
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
        setFilteredOrders(ordersWithDropoffs)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError('Failed to load orders')
        setLoading(false)
      }
    }

    fetchOrders()
  }, [router])

  // Filter orders based on search and filters
  useEffect(() => {
    let filtered = orders

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.contact_number.includes(searchTerm) ||
        (order.driver_name && order.driver_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at)
        switch (dateFilter) {
          case 'today':
            return orderDate >= today
          case 'yesterday':
            return orderDate >= yesterday && orderDate < today
          case 'last_week':
            return orderDate >= lastWeek
          case 'last_month':
            return orderDate >= lastMonth
          default:
            return true
        }
      })
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter, dateFilter])

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

  const exportToCSV = () => {
    const headers = ['Tracking ID', 'Status', 'Client', 'Contact', 'Pickup Address', 'Created Date', 'Vehicle Type', 'Estimated Cost', 'Drop-offs', 'Driver']
    const csvData = filteredOrders.map(order => [
      order.tracking_id,
      getStatusText(order.status),
      order.contact_person,
      order.contact_number,
      order.pickup_address,
      formatDate(order.created_at),
      order.vehicle_type || 'N/A',
      `₱${order.estimated_cost?.toFixed(2) || 'N/A'}`,
      order.dropoff_count,
      order.driver_name || 'Not assigned'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      // Add status log
      await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: 'cancelled',
        description: 'Order cancelled by inventory staff'
      })

      // Refresh orders
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
      alert('Order cancelled successfully')
    } catch (err) {
      console.error('Error cancelling order:', err)
      alert('Failed to cancel order')
    }
  }

  

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">View and manage orders you've created</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="order_placed">Order Placed</option>
              <option value="driver_assigned">Driver Assigned</option>
              <option value="truck_left_warehouse">Truck Left Warehouse</option>
              <option value="arrived_at_pickup">Arrived at Pickup</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          {/* Export Button */}
          <div>
            <button
              onClick={exportToCSV}
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
          <p className="text-gray-500 mb-6">
            {orders.length === 0 
              ? "You haven't created any orders yet."
              : "No orders match your current filters."
            }
          </p>
          {orders.length === 0 && (
            <Link
              href="/inventory/create-order"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Package className="w-5 h-5" />
              Create Your First Order
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {filteredOrders.map((order) => (
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
                    <p className="text-gray-600 text-sm mb-1">
                      <strong>Client:</strong> {order.contact_person} ({order.contact_number})
                    </p>
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
                  <div className="flex gap-2">
                    <Link
                      href={`/inventory/orders/${order.tracking_id}`}
                      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    {order.status === 'order_placed' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                  </div>
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
              href="/inventory/create-order"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Package className="w-5 h-5" />
              Create New Order
            </Link>
          </div>
        </>
      )}
   </>
  )
}