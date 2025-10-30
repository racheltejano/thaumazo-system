'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

export default function ExportDataPanel() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleExport = async (exportType: string) => {
    setLoading(exportType)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: exportType }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(`${exportType} data exported successfully!`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export data')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(null)
    }
  }

  const exportOptions = [
    {
      id: 'orders',
      title: 'All Orders',
      description: 'Complete order history with delivery details, pricing, and status',
      icon: '📦',
      color: 'blue'
    },
    {
      id: 'clients',
      title: 'Client Database',
      description: 'All clients with contact info, addresses, and order history',
      icon: '👥',
      color: 'green'
    },
    {
      id: 'inventory',
      title: 'Inventory Items',
      description: 'Stock levels, pricing, suppliers, and movement history',
      icon: '📊',
      color: 'purple'
    },
    {
      id: 'drivers',
      title: 'Driver Performance',
      description: 'Driver stats, completed deliveries, and availability',
      icon: '🚛',
      color: 'orange'
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export Data for Power BI</h2>
          <p className="text-sm text-gray-600">Download Excel files for analytics and reporting</p>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-green-800 font-medium">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600">✕</span>
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{option.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
            </div>
            
            <button
              onClick={() => handleExport(option.id)}
              disabled={loading !== null}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                loading === option.id
                  ? 'bg-gray-400 cursor-not-allowed'
                  : `bg-${option.color}-600 hover:bg-${option.color}-700 text-white`
              }`}
              style={{
                backgroundColor: loading === option.id ? undefined : 
                  option.color === 'blue' ? '#2563eb' :
                  option.color === 'green' ? '#16a34a' :
                  option.color === 'purple' ? '#9333ea' :
                  '#ea580c'
              }}
            >
              {loading === option.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export to Excel
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Files are exported in .xlsx format compatible with Power BI and Excel. 
          Data includes all records up to the current date.
        </p>
      </div>
    </div>
  )
}