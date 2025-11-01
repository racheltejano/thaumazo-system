'use client'

import { Package } from 'lucide-react'

export default function InventorySection() {
  return (
    <div className="bg-white rounded-xl shadow-md p-12 border border-gray-100 text-center">
      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Analytics Coming Soon</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Inventory tracking, turnover rates, and stock valuation will be available once inventory management features are implemented.
      </p>
      <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto text-left">
        <h4 className="font-semibold text-gray-900 mb-3">Planned Features:</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Stock Levels:</strong> Real-time inventory quantities and locations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Turnover Rate:</strong> How quickly inventory is sold and replaced</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Stock Valuation:</strong> Total value of inventory on hand</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Reorder Alerts:</strong> Products below minimum stock thresholds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Demand Forecasting:</strong> Predict future inventory needs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Stock Movement:</strong> Track receiving, restocking, and depletion</span>
          </li>
        </ul>
      </div>
    </div>
  )
}