'use client'

import { useState, useEffect } from 'react'
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, RefreshCw, Boxes, AlertCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { supabase } from '@/lib/supabase'

interface InventorySectionProps {
  dateRange: string
}

export default function InventorySection({ dateRange }: InventorySectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // KPI Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    totalVariants: 0
  })

  // Analytics Data
  const [stockByCategory, setStockByCategory] = useState<any[]>([])
  const [stockValueByCategory, setStockValueByCategory] = useState<any[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([])
  const [topValueItems, setTopValueItems] = useState<any[]>([])
  const [stockMovementTrend, setStockMovementTrend] = useState<any[]>([])
  const [supplierDistribution, setSupplierDistribution] = useState<any[]>([])
  const [profitMarginAnalysis, setProfitMarginAnalysis] = useState<any[]>([])

  // REORDER THRESHOLD - Change this value or comment out the section
  const REORDER_THRESHOLD = 10 // ⚠️ CHANGE THIS VALUE or set to 0 to disable

  useEffect(() => {
    fetchInventoryAnalytics()
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

  const fetchInventoryAnalytics = async () => {
    setLoading(true)
    setError('')
    
    try {
      const startDate = getDateRangeFilter()

      // Fetch all inventory data
      const { data: variants, error: variantsError } = await supabase
        .from('inventory_items_variants')
        .select(`
          *,
          item:inventory_items(id, name, category:inventory_items_categories(id, name))
        `)

      if (variantsError) throw variantsError

      // Fetch stock movements for trend analysis
      const { data: movements, error: movementsError } = await supabase
        .from('inventory_items_movements')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true })

      if (movementsError) throw movementsError

      calculateInventoryMetrics(variants || [], movements || [])

    } catch (err: any) {
      console.error('Error fetching inventory analytics:', err)
      setError(err.message || 'Failed to fetch inventory analytics')
    } finally {
      setLoading(false)
    }
  }

  const calculateInventoryMetrics = (variants: any[], movements: any[]) => {
    // Total unique items
    const uniqueItems = new Set(variants.map(v => v.item_id))
    const totalItems = uniqueItems.size

    // Total stock value (cost price × current stock)
    const totalStockValue = variants.reduce((sum, v) => {
      const costPrice = parseFloat(v.cost_price || 0)
      const stock = v.current_stock || 0
      return sum + (costPrice * stock)
    }, 0)

    // ⚠️ LOW STOCK ALERTS - Comment out this section if you don't want reorder alerts
    // START: Low Stock Alert Calculation
    const lowStockItems = REORDER_THRESHOLD > 0 
      ? variants.filter(v => v.current_stock < REORDER_THRESHOLD).length
      : 0
    // END: Low Stock Alert Calculation

    setStats({
      totalItems,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockItems,
      totalVariants: variants.length
    })

    // Stock by Category
    calculateStockByCategory(variants)
    
    // Stock Value by Category
    calculateStockValueByCategory(variants)
    
    // ⚠️ LOW STOCK ALERTS LIST - Comment out this function call to hide low stock alerts
    // START: Low Stock Alerts
    if (REORDER_THRESHOLD > 0) {
      calculateLowStockAlerts(variants)
    }
    // END: Low Stock Alerts
    
    // Top Value Items
    calculateTopValueItems(variants)
    
    // Stock Movement Trend
    calculateStockMovementTrend(movements)
    
    // Supplier Distribution
    calculateSupplierDistribution(variants)
    
    // Profit Margin Analysis
    calculateProfitMarginAnalysis(variants)
  }

  const calculateStockByCategory = (variants: any[]) => {
    const categoryStock: Record<string, number> = {}
    
    variants.forEach(variant => {
      const categoryName = variant.item?.category?.name || 'Uncategorized'
      categoryStock[categoryName] = (categoryStock[categoryName] || 0) + (variant.current_stock || 0)
    })

    const data = Object.entries(categoryStock)
      .map(([category, stock]) => ({ category, stock }))
      .sort((a, b) => b.stock - a.stock)
    
    setStockByCategory(data)
  }

  const calculateStockValueByCategory = (variants: any[]) => {
    const categoryValue: Record<string, number> = {}
    
    variants.forEach(variant => {
      const categoryName = variant.item?.category?.name || 'Uncategorized'
      const value = parseFloat(variant.cost_price || 0) * (variant.current_stock || 0)
      categoryValue[categoryName] = (categoryValue[categoryName] || 0) + value
    })

    const data = Object.entries(categoryValue)
      .map(([name, value]) => ({ 
        name, 
        value: Math.round(value * 100) / 100 
      }))
      .sort((a, b) => b.value - a.value)
    
    setStockValueByCategory(data)
  }

  // ⚠️ LOW STOCK ALERTS - Comment out this entire function to disable
  // START: Low Stock Alerts Function
  const calculateLowStockAlerts = (variants: any[]) => {
    const lowStock = variants
      .filter(v => v.current_stock < REORDER_THRESHOLD)
      .map(v => ({
        sku: v.sku,
        name: v.item?.name || 'Unknown',
        variant: v.variant_name || 'Default',
        currentStock: v.current_stock || 0,
        supplier: v.supplier_name,
        threshold: REORDER_THRESHOLD
      }))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5)
    
    setLowStockAlerts(lowStock)
  }
  // END: Low Stock Alerts Function

  const calculateTopValueItems = (variants: any[]) => {
    const items = variants
      .map(v => ({
        sku: v.sku,
        name: v.item?.name || 'Unknown',
        variant: v.variant_name || 'Default',
        stock: v.current_stock || 0,
        value: parseFloat(v.cost_price || 0) * (v.current_stock || 0),
        costPrice: parseFloat(v.cost_price || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(item => ({
        ...item,
        value: Math.round(item.value * 100) / 100
      }))
    
    setTopValueItems(items)
  }

  const calculateStockMovementTrend = (movements: any[]) => {
    const dailyMovements: Record<string, { in: number, out: number }> = {}
    
    movements.forEach(movement => {
      const date = new Date(movement.created_at).toISOString().split('T')[0]
      const quantity = movement.quantity || 0
      
      if (!dailyMovements[date]) {
        dailyMovements[date] = { in: 0, out: 0 }
      }
      
      if (movement.movement_type === 'stock_in') {
        dailyMovements[date].in += quantity
      } else if (movement.movement_type === 'stock_out') {
        dailyMovements[date].out += quantity
      }
    })

    const data = Object.entries(dailyMovements)
      .map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        stockIn: counts.in,
        stockOut: counts.out
      }))
      .slice(-30)
    
    setStockMovementTrend(data)
  }

  const calculateSupplierDistribution = (variants: any[]) => {
    const supplierStock: Record<string, number> = {}
    
    variants.forEach(variant => {
      const supplier = variant.supplier_name || 'Unknown'
      supplierStock[supplier] = (supplierStock[supplier] || 0) + (variant.current_stock || 0)
    })

    const data = Object.entries(supplierStock)
      .map(([supplier, stock]) => ({ supplier, stock }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5)
    
    setSupplierDistribution(data)
  }

  const calculateProfitMarginAnalysis = (variants: any[]) => {
    const margins = variants
      .filter(v => v.cost_price && v.selling_price)
      .map(v => {
        const cost = parseFloat(v.cost_price)
        const selling = parseFloat(v.selling_price)
        const margin = ((selling - cost) / selling) * 100
        
        return {
          sku: v.sku,
          name: v.item?.name || 'Unknown',
          variant: v.variant_name || 'Default',
          costPrice: cost,
          sellingPrice: selling,
          margin: Math.round(margin * 10) / 10,
          stock: v.current_stock || 0
        }
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5)
    
    setProfitMarginAnalysis(margins)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading inventory analytics...</p>
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
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Items</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalItems}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.totalVariants} variants</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Stock Valuation</h3>
          <p className="text-3xl font-bold text-gray-900">₱{stats.totalStockValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">at cost price</p>
        </div>

        {/* ⚠️ LOW STOCK CARD - Comment out this entire card to hide low stock KPI */}
        {/* START: Low Stock KPI Card */}
        {REORDER_THRESHOLD > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Low Stock Alerts</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.lowStockItems}</p>
            <p className="text-xs text-gray-500 mt-1">below {REORDER_THRESHOLD} units</p>
          </div>
        )}
        {/* END: Low Stock KPI Card */}

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Boxes className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Variants</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalVariants}</p>
          <p className="text-xs text-gray-500 mt-1">across all items</p>
        </div>
      </div>

      {/* Stock Movement Trend */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Stock Movement Trend</h2>
          <p className="text-sm text-gray-600">Daily stock in vs stock out</p>
        </div>
        {stockMovementTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stockMovementTrend}>
              <defs>
                <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="stockIn" stroke="#10b981" fillOpacity={1} fill="url(#colorStockIn)" name="Stock In" />
              <Area type="monotone" dataKey="stockOut" stroke="#ef4444" fillOpacity={1} fill="url(#colorStockOut)" name="Stock Out" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            No movement data available
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock by Category */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Stock by Category</h2>
            <p className="text-sm text-gray-600">Quantity distribution</p>
          </div>
          {stockByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="stock" fill="#3b82f6" name="Units" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No category data
            </div>
          )}
        </div>

        {/* Stock Value by Category */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Stock Value by Category</h2>
            <p className="text-sm text-gray-600">Valuation distribution</p>
          </div>
          {stockValueByCategory.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stockValueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockValueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₱${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No valuation data
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ LOW STOCK ALERTS SECTION - Comment out this entire section to hide low stock alerts */}
      {/* START: Low Stock Alerts Section */}
      {REORDER_THRESHOLD > 0 && lowStockAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Low Stock Alerts
            </h2>
            <p className="text-sm text-gray-600">Items below reorder threshold ({REORDER_THRESHOLD} units)</p>
          </div>
          <div className="space-y-3">
            {lowStockAlerts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name} {item.variant && `- ${item.variant}`}</p>
                  <p className="text-xs text-gray-600">SKU: {item.sku} | Supplier: {item.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">{item.currentStock} units</p>
                  <p className="text-xs text-gray-500">Reorder needed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* END: Low Stock Alerts Section */}

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Value Items */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Items by Value</h2>
            <p className="text-sm text-gray-600">Highest stock valuation</p>
          </div>
          <div className="space-y-4">
            {topValueItems.length > 0 ? topValueItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name} {item.variant && `- ${item.variant}`}</p>
                  <p className="text-xs text-gray-600">{item.stock} units × ₱{item.costPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">₱{item.value.toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-400 py-8">No data available</div>
            )}
          </div>
        </div>

        {/* Supplier Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Top Suppliers by Stock</h2>
            <p className="text-sm text-gray-600">Stock quantity by supplier</p>
          </div>
          {supplierDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={supplierDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="supplier" type="category" stroke="#6b7280" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#10b981" name="Units" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No supplier data
            </div>
          )}
        </div>
      </div>

      {/* Profit Margin Analysis */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Profit Margin Analysis</h2>
          <p className="text-sm text-gray-600">Top items by margin percentage</p>
        </div>
        <div className="space-y-3">
          {profitMarginAnalysis.length > 0 ? profitMarginAnalysis.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name} {item.variant && `- ${item.variant}`}</p>
                <p className="text-xs text-gray-600">Cost: ₱{item.costPrice} | Selling: ₱{item.sellingPrice} | Stock: {item.stock}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${item.margin >= 30 ? 'text-green-600' : item.margin >= 15 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {item.margin}%
                </p>
                <p className="text-xs text-gray-500">margin</p>
              </div>
            </div>
          )) : (
            <div className="text-center text-gray-400 py-8">No pricing data available</div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">Inventory Analytics Configuration</p>
            <p className="text-sm text-blue-800 mt-1">
              Current reorder threshold: <strong>{REORDER_THRESHOLD} units</strong>. 
              To change this value or disable low stock alerts, see the comments in the code.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}