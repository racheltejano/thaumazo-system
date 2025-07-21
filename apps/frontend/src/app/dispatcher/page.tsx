'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { 
  Package, 
  Truck, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Timer,
  Activity
} from 'lucide-react'

interface DashboardStats {
  totalOrders: number
  activeOrders: number
  completedToday: number
  unassignedOrders: number
  totalDrivers: number
  activeDrivers: number
  availableDrivers: number
  completionRate: number
}

interface RecentOrder {
  id: string
  tracking_id: string
  status: string
  pickup_address: string
  delivery_address: string
  created_at: string
  pickup_timestamp: string
  driver_name?: string
  client_name?: string
}

interface DriverStatus {
  id: string
  name: string
  status: 'available' | 'busy' | 'offline'
  current_orders: number
  last_activity: string
}

export default function DispatcherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const auth = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    unassignedOrders: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    availableDrivers: 0,
    completionRate: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [driverStatuses, setDriverStatuses] = useState<DriverStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Get today's date range in Manila timezone
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

        // Fetch all statistics in parallel
        const [
          { count: totalOrders },
          { count: activeOrders },
          { count: completedToday },
          { count: unassignedOrders },
          { count: totalDrivers },
          { data: recentOrdersData },
          { data: driversData }
        ] = await Promise.all([
          // Total orders
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true }),
          
          // Active orders (assigned but not delivered)
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup']),
          
          // Completed today
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'delivered')
            .gte('updated_at', startOfDay.toISOString())
            .lt('updated_at', endOfDay.toISOString()),
          
          // Unassigned orders
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'order_placed'),
          
          // Total drivers
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'driver'),
          
          // Recent orders with client and driver info
          supabase
            .from('orders')
            .select(`
              id,
              tracking_id,
              status,
              pickup_address,
              delivery_address,
              created_at,
              pickup_timestamp,
              profiles!driver_id (
                first_name,
                last_name
              ),
              clients!client_id (
                business_name,
                contact_person
              )
            `)
            .order('created_at', { ascending: false })
            .limit(6),
          
          // Drivers with their current order counts
          supabase
            .from('profiles')
            .select(`
              id,
              first_name,
              last_name,
              last_login,
              orders!driver_id (
                id,
                status
              )
            `)
            .eq('role', 'driver')
        ])

        // Process driver statuses
        const processedDrivers: DriverStatus[] = (driversData || []).map(driver => {
          const activeOrders = driver.orders?.filter(order => 
            ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup'].includes(order.status)
          ).length || 0
          
          const lastLogin = driver.last_login ? new Date(driver.last_login) : null
          const isRecentlyActive = lastLogin && (Date.now() - lastLogin.getTime()) < 24 * 60 * 60 * 1000 // 24 hours
          
          let status: 'available' | 'busy' | 'offline' = 'offline'
          if (activeOrders > 0) {
            status = 'busy'
          } else if (isRecentlyActive) {
            status = 'available'
          }

          return {
            id: driver.id,
            name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
            status,
            current_orders: activeOrders,
            last_activity: driver.last_login || ''
          }
        })

        // Calculate derived statistics
        const activeDrivers = processedDrivers.filter(d => d.status === 'busy').length
        const availableDrivers = processedDrivers.filter(d => d.status === 'available').length
        const completionRate = totalOrders && totalOrders > 0 
          ? Math.round(((totalOrders - (activeOrders || 0) - (unassignedOrders || 0)) / totalOrders) * 100)
          : 0

        setStats({
          totalOrders: totalOrders || 0,
          activeOrders: activeOrders || 0,
          completedToday: completedToday || 0,
          unassignedOrders: unassignedOrders || 0,
          totalDrivers: totalDrivers || 0,
          activeDrivers,
          availableDrivers,
          completionRate
        })

        // Process recent orders
        const processedOrders: RecentOrder[] = (recentOrdersData || []).map(order => ({
          ...order,
          driver_name: order.profiles 
            ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim()
            : undefined,
          client_name: order.clients?.business_name || order.clients?.contact_person || 'Unknown Client'
        }))

        setRecentOrders(processedOrders)
        setDriverStatuses(processedDrivers)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh()
    }
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'driver_assigned':
        return 'bg-blue-100 text-blue-800'
      case 'truck_left_warehouse':
        return 'bg-yellow-100 text-yellow-800'
      case 'arrived_at_pickup':
        return 'bg-orange-100 text-orange-800'
      case 'order_placed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'busy':
        return 'bg-yellow-100 text-yellow-800'
      case 'offline':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeOrders}</p>
            </div>
            <Truck className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Unassigned Orders */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unassigned</p>
              <p className="text-3xl font-bold text-gray-900">{stats.unassignedOrders}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Driver Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDrivers}</p>
            </div>
            <Users className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Drivers</p>
              <p className="text-2xl font-bold text-green-600">{stats.availableDrivers}</p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-gray-900">#{order.tracking_id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3 h-3 mt-1 text-gray-400" />
                      <span className="truncate">{order.pickup_address}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {order.client_name} • {formatTime(order.created_at)}
                      </span>
                      {order.driver_name && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {order.driver_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Driver Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Driver Status</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          
          {driverStatuses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No drivers found</p>
          ) : (
            <div className="space-y-4">
              {driverStatuses.slice(0, 8).map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{driver.name || 'Unknown Driver'}</p>
                      <p className="text-sm text-gray-500">
                        {driver.current_orders} active orders
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDriverStatusColor(driver.status)}`}>
                    {driver.status}
                  </span>
                </div>
              ))}
              
              {driverStatuses.length > 8 && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => router.push('/dispatcher/drivers')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View all {driverStatuses.length} drivers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/dispatcher/calendar')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-6 h-6 text-orange-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Calendar</p>
              <p className="text-sm text-gray-500">Manage schedules and assignments</p>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dispatcher/drivers')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-6 h-6 text-orange-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Drivers</p>
              <p className="text-sm text-gray-500">View driver profiles and performance</p>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dispatcher/calendar')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Assign Orders</p>
              <p className="text-sm text-gray-500">Auto-assign or manually assign orders</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}