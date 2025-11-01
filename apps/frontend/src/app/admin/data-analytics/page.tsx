'use client'

import { useState, useEffect } from 'react'
import { Truck, DollarSign, Package, ShoppingCart, ChevronDown } from 'lucide-react'
import LogisticsSection from './logistics/LogisticsSection'
import SalesSection from './sales/SalesSection'
import InventorySection from './inventory/InventorySection'
import ProcurementSection from './procurement/ProcurementSection'

type TabType = 'logistics' | 'sales' | 'inventory' | 'procurement'

export default function DataAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('logistics')
  const [dateRange, setDateRange] = useState('last-30-days')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  const tabs = [
    { id: 'logistics' as TabType, label: 'Logistics', icon: Truck },
    { id: 'sales' as TabType, label: 'Sales', icon: DollarSign },
    { id: 'inventory' as TabType, label: 'Inventory', icon: Package },
    { id: 'procurement' as TabType, label: 'Procurement', icon: ShoppingCart }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`max-w-7xl mx-auto px-6 py-8 transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive business insights and metrics</p>
            </div>
            
            {/* Date Range Filter */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="last-7-days">Last 7 Days</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-90-days">Last 90 Days</option>
                <option value="this-year">This Year</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 font-medium transition-all rounded-t-lg
                    ${isActive 
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section Content */}
        {activeTab === 'logistics' && <LogisticsSection dateRange={dateRange} />}
        {activeTab === 'sales' && <SalesSection dateRange={dateRange} />}
        {activeTab === 'inventory' && <InventorySection dateRange={dateRange} />}
        {activeTab === 'procurement' && <ProcurementSection dateRange={dateRange} />}
      </div>
    </div>
  )
}