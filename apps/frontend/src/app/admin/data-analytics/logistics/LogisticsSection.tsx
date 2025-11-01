'use client'

import { useState, useEffect } from 'react'
import { Clock, MapPin, TrendingUp, Package, AlertCircle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

interface LogisticsSectionProps {
  dateRange: string
}

export default function LogisticsSection({ dateRange }: LogisticsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({
    avgDeliveryTime: 0,
    onTimeRate: 0,
    totalDeliveries: 0,
    activeRoutes: 0
  })
  const [statusDistribution, setStatusDistribution] = useState<any[]>([])
  const [vehicleUtilization, setVehicleUtilization] = useState<any[]>([])
  const [topRoutes, setTopRoutes] = useState<any[]>([])
  const [driverPerformance, setDriverPerformance] = useState<any[]>([])
  const [priorityBreakdown, setPriorityBreakdown] = useState<any[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const getDateRangeFilter = () => {
    const now = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case 'last-7-days':
        startDate.setDate(now.getDate() - 7)
        break
      case 'last-30-days':
        startDate.setDate(now.getDate() - 30)
        break
      case 'last-90-days':
        startDate.setDate(now.getDate() - 90)
        break
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }
    
    return startDate.toISOString()
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')
    
    try {
      const startDate = getDateRangeFilter()

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(pickup_address, pickup_area, pickup_latitude, pickup_longitude),
          driver:profiles(first_name, last_name),
          dropoffs:order_dropoffs(*)
        `)
        .gte('created_at', startDate)

      if (ordersError) throw ordersError

      const orderIds = orders?.map(o => o.id) || []
      const { data: statusLogs, error: logsError } = await supabase
        .from('order_status_logs')
        .select('*')
        .in('order_id', orderIds)
        .order('timestamp', { ascending: false })

      if (logsError) throw logsError

      calculateMetrics(orders || [], statusLogs || [])

    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const getUniqueStatusChanges = (logs: any[], orderId: string) => {
    const orderLogs = logs.filter(log => log.order_id === orderId)
    const uniqueChanges: any[] = []
    let lastStatus = ''
    orderLogs.reverse().forEach(log => {
      if (log.status !== lastStatus) {
        uniqueChanges.push(log)
        lastStatus = log.status
      }
    })
    return uniqueChanges
  }

  const getTimeBetweenStatuses = (logs: any[], orderId: string, fromStatus: string, toStatus: string) => {
    const uniqueLogs = getUniqueStatusChanges(logs, orderId)
    const fromLog = uniqueLogs.find(log => log.status === fromStatus)
    const toLog = uniqueLogs.find(log => log.status === toStatus)
    if (!fromLog || !toLog) return null
    const fromTime = new Date(fromLog.timestamp).getTime()
    const toTime = new Date(toLog.timestamp).getTime()
    return Math.round((toTime - fromTime) / 60000)
  }

  const calculateMetrics = (orders: any[], statusLogs: any[]) => {
    const totalOrders = orders.length
    const deliveredOrders = orders.filter(o => o.status === 'delivered')
    
    let totalDeliveryTime = 0
    let validDeliveryTimeCount = 0

    deliveredOrders.forEach(order => {
      const timeToDeliver = getTimeBetweenStatuses(statusLogs, order.id, 'order_placed', 'delivered')
      if (timeToDeliver !== null && timeToDeliver > 0) {
        totalDeliveryTime += timeToDeliver
        validDeliveryTimeCount++
      }
    })

    const avgTime = validDeliveryTimeCount > 0 ? Math.round(totalDeliveryTime / validDeliveryTimeCount) : 0

    let onTimeCount = 0
    let measurableOrders = 0

    deliveredOrders.forEach(order => {
      if (!order.delivery_window_end) return
      const uniqueLogs = getUniqueStatusChanges(statusLogs, order.id)
      const deliveredLog = uniqueLogs.find(log => log.status === 'delivered')
      if (deliveredLog) {
        measurableOrders++
        const deliveredTime = new Date(deliveredLog.timestamp)
        const windowEnd = new Date(order.delivery_window_end)
        if (deliveredTime <= windowEnd) onTimeCount++
      }
    })

    const onTimeRate = measurableOrders > 0 ? (onTimeCount / measurableOrders) * 100 : 0
    const uniqueRoutes = new Set(orders.flatMap(o => (o.dropoffs || []).map((d: any) => `${o.client?.pickup_area}-${d.dropoff_address}`)))

    setStats({
      avgDeliveryTime: avgTime,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      totalDeliveries: deliveredOrders.length,
      activeRoutes: uniqueRoutes.size
    })

    // Status distribution
    const statusCount: Record<string, number> = {}
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1
    })
    const distribution = Object.entries(statusCount).map(([status, count]) => ({
      status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: Math.round((count / orders.length) * 100)
    }))
    setStatusDistribution(distribution)

    // Vehicle utilization
    const vehicleCount: Record<string, number> = {}
    orders.forEach(order => {
      if (order.vehicle_type) {
        vehicleCount[order.vehicle_type] = (vehicleCount[order.vehicle_type] || 0) + 1
      }
    })
    const utilization = Object.entries(vehicleCount).map(([type, count]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      utilization: Math.round((count / orders.length) * 100)
    }))
    setVehicleUtilization(utilization)

    // Top routes
    const routeStats: Record<string, { count: number, totalDuration: number }> = {}
    orders.forEach(order => {
      const pickupArea = order.client?.pickup_area || 'Unknown'
      order.dropoffs?.forEach((dropoff: any) => {
        const route = `${pickupArea} → ${dropoff.dropoff_address?.substring(0, 30)}...`
        if (!routeStats[route]) routeStats[route] = { count: 0, totalDuration: 0 }
        routeStats[route].count += 1
        routeStats[route].totalDuration += dropoff.estimated_duration_mins || 0
      })
    })
    const routes = Object.entries(routeStats)
      .map(([route, stats]) => ({
        route,
        orders: stats.count,
        avgTime: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
    setTopRoutes(routes)

    // Driver performance
    const driverStats: Record<string, any> = {}
    orders.forEach(order => {
      if (order.driver_id && order.driver) {
        const driverId = order.driver_id
        const driverName = `${order.driver.first_name || ''} ${order.driver.last_name || ''}`.trim() || 'Driver'
        if (!driverStats[driverId]) {
          driverStats[driverId] = { name: driverName, deliveries: 0, delivered: 0, onTimeDeliveries: 0, totalDeliveryTime: 0 }
        }
        driverStats[driverId].deliveries += 1
        if (order.status === 'delivered') {
          driverStats[driverId].delivered += 1
          if (order.delivery_window_end) {
            const uniqueLogs = getUniqueStatusChanges(statusLogs, order.id)
            const deliveredLog = uniqueLogs.find(log => log.status === 'delivered')
            if (deliveredLog) {
              const deliveredTime = new Date(deliveredLog.timestamp)
              const windowEnd = new Date(order.delivery_window_end)
              if (deliveredTime <= windowEnd) driverStats[driverId].onTimeDeliveries += 1
            }
          }
          const deliveryTime = getTimeBetweenStatuses(statusLogs, order.id, 'order_placed', 'delivered')
          if (deliveryTime) driverStats[driverId].totalDeliveryTime += deliveryTime
        }
      }
    })
    const performance = Object.values(driverStats)
      .map((driver: any) => ({
        name: driver.name,
        deliveries: driver.deliveries,
        onTime: driver.delivered > 0 ? Math.round((driver.onTimeDeliveries / driver.delivered) * 100) : 0,
        avgTime: driver.delivered > 0 ? Math.round(driver.totalDeliveryTime / driver.delivered) : 0
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5)
    setDriverPerformance(performance)

    // Priority breakdown
    const priorityCount: Record<string, number> = { low: 0, medium: 0, high: 0 }
    orders.forEach(order => {
      const priority = order.priority_level || 'medium'
      priorityCount[priority] = (priorityCount[priority] || 0) + 1
    })
    const breakdown = Object.entries(priorityCount).map(([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
      percentage: Math.round((count / orders.length) * 100)
    }))
    setPriorityBreakdown(breakdown)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading logistics analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error loading analytics</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Delivery Time</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.avgDeliveryTime} min</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">On-Time Rate</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.onTimeRate}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Deliveries</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalDeliveries}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Active Routes</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.activeRoutes}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Status Distribution</h2>
            <p className="text-sm text-gray-600">Current order pipeline</p>
          </div>
          <div className="space-y-3">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-2 h-10 rounded-full" style={{ backgroundColor: COLORS[idx % 5] }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.status}</p>
                    <p className="text-xs text-gray-600">{item.count} orders</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Vehicle Utilization</h2>
            <p className="text-sm text-gray-600">Orders by vehicle type</p>
          </div>
          {vehicleUtilization.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vehicleUtilization}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No vehicle data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Routes</h2>
            <p className="text-sm text-gray-600">Most frequent delivery routes</p>
          </div>
          <div className="space-y-4">
            {topRoutes.length > 0 ? topRoutes.map((route, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{route.route}</p>
                  <p className="text-xs text-gray-600">{route.orders} orders</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">{route.avgTime} min</span>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No route data available</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Driver Performance</h2>
            <p className="text-sm text-gray-600">Top performers this period</p>
          </div>
          <div className="space-y-4">
            {driverPerformance.length > 0 ? driverPerformance.map((driver, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {driver.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                    <p className="text-xs text-gray-600">{driver.deliveries} deliveries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{driver.onTime}%</p>
                  <p className="text-xs text-gray-600">on time</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No driver data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Priority Level Breakdown</h2>
          <p className="text-sm text-gray-600">Orders by priority</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {priorityBreakdown.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-gray-900 mb-1">{item.count}</p>
              <p className="text-sm text-gray-600">{item.priority} Priority</p>
              <p className="text-xs text-gray-500 mt-1">{item.percentage}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900 font-medium">Limited Analytics Available</p>
            <p className="text-sm text-amber-800 mt-1">
              Current metrics are based on available data. Additional insights require:
            </p>
            <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Distance Tracking:</strong> Log actual kilometers traveled for route efficiency</li>
              <li><strong>Driver Ratings:</strong> Customer feedback system for quality metrics</li>
              <li><strong>Delay Reasons:</strong> Categorize delays (traffic, weather, loading time) for root cause analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}