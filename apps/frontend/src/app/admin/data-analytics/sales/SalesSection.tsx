'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Activity, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { supabase } from '@/lib/supabase'

interface SalesSectionProps {
  dateRange: string
}

export default function SalesSection({ dateRange }: SalesSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [salesStats, setSalesStats] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    orderCount: 0,
    revenueGrowth: 0
  })
  const [revenueOverTime, setRevenueOverTime] = useState<any[]>([])
  const [revenueByVehicle, setRevenueByVehicle] = useState<any[]>([])
  const [revenueByPriority, setRevenueByPriority] = useState<any[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [salesByStatus, setSalesByStatus] = useState<any[]>([])
  const [orderValueDistribution, setOrderValueDistribution] = useState<any[]>([])

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
          client:clients(id, business_name, contact_person, pickup_address, pickup_area)
        `)
        .gte('created_at', startDate)

      if (ordersError) throw ordersError

      calculateSalesMetrics(orders || [], startDate)

    } catch (err: any) {
      console.error('Error fetching sales analytics:', err)
      setError(err.message || 'Failed to fetch sales analytics')
    } finally {
      setLoading(false)
    }
  }

  const calculateSalesMetrics = (orders: any[], startDate: string) => {
    const ordersWithCost = orders.filter(o => o.estimated_cost && parseFloat(o.estimated_cost) > 0)
    
    const totalRevenue = ordersWithCost.reduce((sum, order) => sum + parseFloat(order.estimated_cost || 0), 0)
    const avgOrderValue = ordersWithCost.length > 0 ? totalRevenue / ordersWithCost.length : 0
    
    // Calculate revenue growth
    const periodStart = new Date(startDate)
    const periodEnd = new Date()
    const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const previousPeriodStart = new Date(periodStart)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays)
    
    const currentPeriodOrders = ordersWithCost.filter(o => new Date(o.created_at) >= periodStart)
    const previousPeriodOrders = ordersWithCost.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= previousPeriodStart && orderDate < periodStart
    })
    
    const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + parseFloat(o.estimated_cost || 0), 0)
    const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + parseFloat(o.estimated_cost || 0), 0)
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    setSalesStats({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      orderCount: ordersWithCost.length,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10
    })

    // Revenue over time
    const dailyRevenue: Record<string, number> = {}
    ordersWithCost.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(order.estimated_cost || 0)
    })
    
    const revenueTimeSeries = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(revenue * 100) / 100,
        orders: ordersWithCost.filter(o => o.created_at.startsWith(date)).length
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
    
    setRevenueOverTime(revenueTimeSeries)

    // Revenue by vehicle type
    const vehicleRevenue: Record<string, number> = {}
    ordersWithCost.forEach(order => {
      const vehicle = order.vehicle_type || 'Unknown'
      vehicleRevenue[vehicle] = (vehicleRevenue[vehicle] || 0) + parseFloat(order.estimated_cost || 0)
    })
    
    const revenueByVehicleData = Object.entries(vehicleRevenue)
      .map(([vehicle, revenue]) => ({
        vehicle: vehicle.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        revenue: Math.round(revenue * 100) / 100,
        orders: ordersWithCost.filter(o => o.vehicle_type === vehicle).length
      }))
      .sort((a, b) => b.revenue - a.revenue)
    
    setRevenueByVehicle(revenueByVehicleData)

    // Revenue by priority
    const priorityRevenue: Record<string, number> = {}
    ordersWithCost.forEach(order => {
      const priority = order.priority_level || 'medium'
      priorityRevenue[priority] = (priorityRevenue[priority] || 0) + parseFloat(order.estimated_cost || 0)
    })
    
    const revenueByPriorityData = Object.entries(priorityRevenue).map(([priority, revenue]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: Math.round(revenue * 100) / 100
    }))
    
    setRevenueByPriority(revenueByPriorityData)

    // Top clients
    const clientRevenue: Record<string, { name: string, revenue: number, orders: number }> = {}
    ordersWithCost.forEach(order => {
      if (order.client) {
        const clientId = order.client.id
        const clientName = order.client.business_name || order.client.contact_person || 'Unknown Client'
        
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = { name: clientName, revenue: 0, orders: 0 }
        }
        
        clientRevenue[clientId].revenue += parseFloat(order.estimated_cost || 0)
        clientRevenue[clientId].orders += 1
      }
    })
    
    const topClientsData = Object.values(clientRevenue)
      .map(client => ({
        ...client,
        revenue: Math.round(client.revenue * 100) / 100,
        avgOrderValue: Math.round((client.revenue / client.orders) * 100) / 100
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    setTopClients(topClientsData)

    // Sales by status
    const statusRevenue: Record<string, number> = {}
    ordersWithCost.forEach(order => {
      statusRevenue[order.status] = (statusRevenue[order.status] || 0) + parseFloat(order.estimated_cost || 0)
    })
    
    const salesByStatusData = Object.entries(statusRevenue).map(([status, revenue]) => ({
      status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      revenue: Math.round(revenue * 100) / 100,
      count: ordersWithCost.filter(o => o.status === status).length
    }))
    
    setSalesByStatus(salesByStatusData)

    // Order value distribution
    const ranges = [
      { label: '₱0-50', min: 0, max: 50 },
      { label: '₱51-100', min: 51, max: 100 },
      { label: '₱101-200', min: 101, max: 200 },
      { label: '₱201-500', min: 201, max: 500 },
      { label: '₱500+', min: 501, max: Infinity }
    ]
    
    const distribution = ranges.map(range => ({
      range: range.label,
      count: ordersWithCost.filter(o => {
        const cost = parseFloat(o.estimated_cost || 0)
        return cost >= range.min && cost <= range.max
      }).length
    }))
    
    setOrderValueDistribution(distribution)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading sales analytics...</p>
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
      {/* Sales KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900">₱{salesStats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</h3>
          <p className="text-3xl font-bold text-gray-900">₱{salesStats.avgOrderValue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
          <p className="text-3xl font-bold text-gray-900">{salesStats.orderCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${salesStats.revenueGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {salesStats.revenueGrowth >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Revenue Growth</h3>
          <p className={`text-3xl font-bold ${salesStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {salesStats.revenueGrowth > 0 ? '+' : ''}{salesStats.revenueGrowth}%
          </p>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
          <p className="text-sm text-gray-600">Daily revenue performance</p>
        </div>
        {revenueOverTime.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueOverTime}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => [`₱${value}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            No revenue data available
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Vehicle Type</h2>
            <p className="text-sm text-gray-600">Service type performance</p>
          </div>
          {revenueByVehicle.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByVehicle} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="vehicle" type="category" stroke="#6b7280" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any) => [`₱${value}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No vehicle revenue data
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Priority</h2>
            <p className="text-sm text-gray-600">Priority level distribution</p>
          </div>
          {revenueByPriority.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueByPriority}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₱${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No priority data
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Clients by Revenue</h2>
            <p className="text-sm text-gray-600">Highest value customers</p>
          </div>
          <div className="space-y-4">
            {topClients.length > 0 ? topClients.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-600">{client.orders} orders · Avg ₱{client.avgOrderValue}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">₱{client.revenue.toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No client data available</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Value Distribution</h2>
            <p className="text-sm text-gray-600">Orders by price range</p>
          </div>
          {orderValueDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={orderValueDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No distribution data
            </div>
          )}
        </div>
      </div>

      {/* Sales by Status */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Revenue by Order Status</h2>
          <p className="text-sm text-gray-600">Financial impact of order pipeline</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {salesByStatus.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % 5] }}
                />
                <p className="text-xs font-medium text-gray-600">{item.status}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">₱{item.revenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{item.count} orders</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">Sales Analytics Notes</p>
            <p className="text-sm text-blue-800 mt-1">
              Revenue calculations are based on <strong>estimated delivery fees</strong> from orders. 
              For more comprehensive sales analytics, consider adding:
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Actual Invoicing:</strong> Track final invoiced amounts vs estimates</li>
              <li><strong>Payment Status:</strong> Monitor outstanding receivables and cash flow</li>
              <li><strong>Product Pricing:</strong> Calculate revenue from individual products sold</li>
              <li><strong>Discounts & Promotions:</strong> Track discount impact on margins</li>
              <li><strong>Profit Margins:</strong> Add cost data (COGS, fuel, labor) to calculate profitability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}