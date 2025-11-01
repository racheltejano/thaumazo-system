'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingUp, Users, Package, RefreshCw, AlertCircle, DollarSign } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { supabase } from '@/lib/supabase'

interface ProcurementSectionProps {
  dateRange: string
}

export default function ProcurementSection({ dateRange }: ProcurementSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPurchaseValue: 0,
    activeSuppliers: 0,
    avgPurchaseValue: 0
  })

  const [purchaseTrend, setPurchaseTrend] = useState<any[]>([])
  const [supplierPerformance, setSupplierPerformance] = useState<any[]>([])
  const [purchasesByReferenceType, setPurchasesByReferenceType] = useState<any[]>([])
  const [topPurchasedItems, setTopPurchasedItems] = useState<any[]>([])
  const [costTrends, setCostTrends] = useState<any[]>([])
  const [supplierSpend, setSupplierSpend] = useState<any[]>([])

  useEffect(() => {
    fetchProcurementAnalytics()
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

  const fetchProcurementAnalytics = async () => {
    setLoading(true)
    setError('')
    
    try {
      const startDate = getDateRangeFilter()

      // Fetch stock_in movements (purchases)
      const { data: movements, error: movementsError } = await supabase
        .from('inventory_items_movements')
        .select(`
          *,
          variant:inventory_items_variants(
            id, sku, variant_name, supplier_name, supplier_email, supplier_number,
            item:inventory_items(name, category:inventory_items_categories(name))
          )
        `)
        .eq('movement_type', 'stock_in')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true })

      if (movementsError) throw movementsError

      calculateProcurementMetrics(movements || [])

    } catch (err: any) {
      console.error('Error fetching procurement analytics:', err)
      setError(err.message || 'Failed to fetch procurement analytics')
    } finally {
      setLoading(false)
    }
  }

  const calculateProcurementMetrics = (movements: any[]) => {
    // Total purchases (stock_in movements)
    const totalPurchases = movements.length

    // Total purchase value
    const totalPurchaseValue = movements.reduce((sum, m) => {
      const price = parseFloat(m.price_at_movement || 0)
      const quantity = m.quantity || 0
      return sum + (price * quantity)
    }, 0)

    // Active suppliers
    const uniqueSuppliers = new Set(
      movements.map(m => m.variant?.supplier_name).filter(Boolean)
    )
    const activeSuppliers = uniqueSuppliers.size

    // Average purchase value
    const avgPurchaseValue = totalPurchases > 0 ? totalPurchaseValue / totalPurchases : 0

    setStats({
      totalPurchases,
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      activeSuppliers,
      avgPurchaseValue: Math.round(avgPurchaseValue * 100) / 100
    })

    // Purchase trend over time
    calculatePurchaseTrend(movements)

    // Supplier performance
    calculateSupplierPerformance(movements)

    // Purchases by reference type
    calculatePurchasesByReferenceType(movements)

    // Top purchased items
    calculateTopPurchasedItems(movements)

    // Cost trends
    calculateCostTrends(movements)

    // Supplier spend
    calculateSupplierSpend(movements)
  }

  const calculatePurchaseTrend = (movements: any[]) => {
    const dailyPurchases: Record<string, { count: number, value: number }> = {}

    movements.forEach(movement => {
      const date = new Date(movement.created_at).toISOString().split('T')[0]
      const value = parseFloat(movement.price_at_movement || 0) * (movement.quantity || 0)

      if (!dailyPurchases[date]) {
        dailyPurchases[date] = { count: 0, value: 0 }
      }

      dailyPurchases[date].count += 1
      dailyPurchases[date].value += value
    })

    const data = Object.entries(dailyPurchases)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        purchases: stats.count,
        value: Math.round(stats.value * 100) / 100
      }))
      .slice(-30)

    setPurchaseTrend(data)
  }

  const calculateSupplierPerformance = (movements: any[]) => {
    const supplierStats: Record<string, { 
      name: string, 
      purchases: number, 
      totalQuantity: number,
      email?: string,
      phone?: string 
    }> = {}

    movements.forEach(movement => {
      const supplier = movement.variant?.supplier_name || 'Unknown'
      const email = movement.variant?.supplier_email
      const phone = movement.variant?.supplier_number

      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { 
          name: supplier, 
          purchases: 0, 
          totalQuantity: 0,
          email,
          phone
        }
      }

      supplierStats[supplier].purchases += 1
      supplierStats[supplier].totalQuantity += movement.quantity || 0
    })

    const data = Object.values(supplierStats)
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 5)

    setSupplierPerformance(data)
  }

  const calculatePurchasesByReferenceType = (movements: any[]) => {
    const typeCount: Record<string, number> = {}

    movements.forEach(movement => {
      const type = movement.reference_type || 'unspecified'
      typeCount[type] = (typeCount[type] || 0) + 1
    })

    const data = Object.entries(typeCount).map(([type, count]) => ({
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }))

    setPurchasesByReferenceType(data)
  }

  const calculateTopPurchasedItems = (movements: any[]) => {
    const itemQuantities: Record<string, {
      name: string,
      variant: string,
      sku: string,
      quantity: number,
      times: number
    }> = {}

    movements.forEach(movement => {
      const sku = movement.variant?.sku || 'Unknown'
      const name = movement.variant?.item?.name || 'Unknown'
      const variant = movement.variant?.variant_name || 'Default'

      if (!itemQuantities[sku]) {
        itemQuantities[sku] = { name, variant, sku, quantity: 0, times: 0 }
      }

      itemQuantities[sku].quantity += movement.quantity || 0
      itemQuantities[sku].times += 1
    })

    const data = Object.values(itemQuantities)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    setTopPurchasedItems(data)
  }

  const calculateCostTrends = (movements: any[]) => {
    // Group by month for better trend visibility
    const monthlyCosts: Record<string, { totalCost: number, count: number }> = {}

    movements.forEach(movement => {
      const date = new Date(movement.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const cost = parseFloat(movement.price_at_movement || 0) * (movement.quantity || 0)

      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = { totalCost: 0, count: 0 }
      }

      monthlyCosts[monthKey].totalCost += cost
      monthlyCosts[monthKey].count += 1
    })

    const data = Object.entries(monthlyCosts)
      .map(([month, stats]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        avgCost: stats.count > 0 ? Math.round((stats.totalCost / stats.count) * 100) / 100 : 0,
        totalCost: Math.round(stats.totalCost * 100) / 100
      }))
      .slice(-12)

    setCostTrends(data)
  }

  const calculateSupplierSpend = (movements: any[]) => {
    const supplierSpending: Record<string, number> = {}

    movements.forEach(movement => {
      const supplier = movement.variant?.supplier_name || 'Unknown'
      const spend = parseFloat(movement.price_at_movement || 0) * (movement.quantity || 0)
      supplierSpending[supplier] = (supplierSpending[supplier] || 0) + spend
    })

    const data = Object.entries(supplierSpending)
      .map(([supplier, spend]) => ({
        supplier,
        spend: Math.round(spend * 100) / 100
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)

    setSupplierSpend(data)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading procurement analytics...</p>
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Purchases</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalPurchases}</p>
          <p className="text-xs text-gray-500 mt-1">stock-in movements</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Purchase Value</h3>
          <p className="text-3xl font-bold text-gray-900">₱{stats.totalPurchaseValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">total spend</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Active Suppliers</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.activeSuppliers}</p>
          <p className="text-xs text-gray-500 mt-1">unique suppliers</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Purchase Value</h3>
          <p className="text-3xl font-bold text-gray-900">₱{stats.avgPurchaseValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">per transaction</p>
        </div>
      </div>

      {/* Purchase Trend */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Purchase Trend</h2>
          <p className="text-sm text-gray-600">Daily purchase activity and spend</p>
        </div>
        {purchaseTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={purchaseTrend}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'value') return [`₱${value}`, 'Spend']
                  return [value, 'Purchases']
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" name="value" />
              <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} name="purchases" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            No purchase data available
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Supplier Performance */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Supplier Performance</h2>
            <p className="text-sm text-gray-600">Purchase frequency by supplier</p>
          </div>
          <div className="space-y-4">
            {supplierPerformance.length > 0 ? supplierPerformance.map((supplier, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {supplier.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-xs text-gray-600">{supplier.totalQuantity} units purchased</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{supplier.purchases}</p>
                  <p className="text-xs text-gray-500">purchases</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No supplier data</div>
            )}
          </div>
        </div>

        {/* Purchases by Reference Type */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Purchases by Type</h2>
            <p className="text-sm text-gray-600">Purchase order, initial stock, etc.</p>
          </div>
          {purchasesByReferenceType.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={purchasesByReferenceType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {purchasesByReferenceType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No reference data
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Purchased Items */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Purchased Items</h2>
            <p className="text-sm text-gray-600">Most frequently restocked</p>
          </div>
          <div className="space-y-4">
            {topPurchasedItems.length > 0 ? topPurchasedItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name} {item.variant && `- ${item.variant}`}</p>
                  <p className="text-xs text-gray-600">SKU: {item.sku} | {item.times} purchases</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{item.quantity}</p>
                  <p className="text-xs text-gray-500">units</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No item data</div>
            )}
          </div>
        </div>

        {/* Supplier Spend */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Supplier Spend</h2>
            <p className="text-sm text-gray-600">Total spending by supplier</p>
          </div>
          {supplierSpend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={supplierSpend} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="supplier" type="category" stroke="#6b7280" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`₱${value}`, 'Spend']} />
                <Bar dataKey="spend" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No spend data
            </div>
          )}
        </div>
      </div>

      {/* Cost Trends */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Cost Trends</h2>
          <p className="text-sm text-gray-600">Monthly average and total purchase costs</p>
        </div>
        {costTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value: any) => `₱${value}`} />
              <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} name="Total Cost" />
              <Line type="monotone" dataKey="avgCost" stroke="#10b981" strokeWidth={2} name="Avg Cost" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            No cost trend data
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900 font-medium">Limited Procurement Analytics</p>
            <p className="text-sm text-amber-800 mt-1">
              Analytics are based on <strong>stock_in movements</strong> from inventory. 
              For comprehensive procurement tracking, consider adding:
            </p>
            <ul className="text-sm text-amber-800 mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Purchase Orders:</strong> Formal PO tracking with approval workflow</li>
              <li><strong>Lead Time Tracking:</strong> Order date → delivery date analysis</li>
              <li><strong>Quality Metrics:</strong> Track defects and returns per supplier</li>
              <li><strong>Supplier Ratings:</strong> Performance scoring and evaluation</li>
              <li><strong>Order Accuracy:</strong> Quantity ordered vs quantity received</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}