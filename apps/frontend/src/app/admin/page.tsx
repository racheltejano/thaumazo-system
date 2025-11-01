'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import {
  Plus,
  Users,
  Package,
  RefreshCw,
  Check,
  Mail,
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Form / action states
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formStatus, setFormStatus] = useState('') // messages like "Sending..." / success / failure
  const [email, setEmail] = useState('')
  const [generatedTrackingId, setGeneratedTrackingId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  // Export states
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string>('')
  const [exportSuccess, setExportSuccess] = useState<string>('')

  // auth
  const auth = useAuth()
  const user = auth?.user
  const role = auth?.role
  const authLoading = auth?.loading

  // dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: null as number | null,
    activeDrivers: null as number | null,
    revenue: null as number | null,
    pendingApprovals: null as number | null,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setLoadingAuth(false)
    }
  }, [user, role, authLoading, router])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true)
      try {
        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })

        const { count: activeDrivers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('can_login', true)

        const { data: deliveredOrders } = await supabase
          .from('orders')
          .select('estimated_cost')
          .eq('status', 'delivered')

        const revenue =
          deliveredOrders?.reduce((sum, order) => sum + Number(order.estimated_cost || 0), 0) || 0

        const { data: pendingApprovals } = await supabase.rpc('get_unapproved_users')
        const pendingCount = pendingApprovals?.length || 0

        setDashboardStats({
          totalOrders: totalOrders ?? 0,
          activeDrivers: activeDrivers ?? 0,
          revenue,
          pendingApprovals: pendingCount,
        })
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Combined action: generate tracking id, then send email
  const handleSendForm = async () => {
    setFormError('')
    setFormStatus('')
    setGeneratedTrackingId(null)

    // Validation
    if (!email || !email.trim()) {
      setFormError('Please enter a client email address.')
      return
    }

    setLoading(true)
    setFormStatus('Preparing Email...')

    try {
      // 1) Generate tracking ID (your existing server endpoint)
      const genRes = await fetch('/api/client/generate-tracking-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // If your generate endpoint expects body data, adapt here.
        body: JSON.stringify({}), // keep empty if endpoint uses no body
      })

      let genJson
      try {
        genJson = await genRes.json()
      } catch (err) {
        throw new Error('Invalid response when generating tracking ID.')
      }

      if (!genRes.ok || !genJson?.success) {
        throw new Error(genJson?.error || 'Failed to generate tracking ID.')
      }

      const trackingId = genJson.trackingId || genJson.tracking_id || genJson.id || null

      if (!trackingId) {
        // defensive: some endpoints might return different prop names
        throw new Error('Tracking ID not returned by server.')
      }

      setGeneratedTrackingId(trackingId)
      setFormStatus('Tracking ID generated. Sending email...')
      // 2) Send email with tracking ID
      const mailRes = await fetch('/api/send-tracking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), trackingId }),
      })

      let mailJson
      try {
        mailJson = await mailRes.json()
      } catch (err) {
        throw new Error('Invalid response from email API.')
      }

      if (!mailRes.ok || !mailJson?.success) {
        // show server error if available
        throw new Error(mailJson?.error || 'Failed to send email.')
      }

      // Success
      setFormStatus('✅ Order form email sent successfully!')
      setEmail('') // clear input
      // clear message after 6 seconds
      setTimeout(() => setFormStatus(''), 6000)
    } catch (err: any) {
      console.error('Error in send form flow:', err)
      setFormError(err?.message || 'An unexpected error occurred.')
      // clear after 6 seconds
      setTimeout(() => setFormError(''), 6000)
    } finally {
      setLoading(false)
    }
  }
  // Handle export data
  const handleExport = async (exportType: string) => {
    setExportLoading(exportType)
    setExportError('')
    setExportSuccess('')

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('Session:', session ? 'Found' : 'Not found') // Debug log
      
      if (!session) {
        throw new Error('No active session')
      }

      console.log('Calling API:', '/api/admin/export', 'Type:', exportType) // Debug log

      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ type: exportType }),
      })

      console.log('Response status:', response.status) // Debug log
      console.log('Response headers:', response.headers.get('content-type')) // Debug log

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Export failed')
        } else {
          const text = await response.text()
          console.error('Non-JSON response:', text.substring(0, 200)) // Show first 200 chars
          throw new Error('Server returned an invalid response')
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(`${exportType} data exported successfully!`)
      setTimeout(() => setExportSuccess(''), 5000)
    } catch (err: any) {
      console.error('Export error:', err)
      setExportError(err.message || 'Failed to export data')
      setTimeout(() => setExportError(''), 5000)
    } finally {
      setExportLoading(null)
    }
  }
  if (loadingAuth || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-orange-500 text-xl font-semibold mb-4">🔐 Checking your access...</p>
        <div className="mt-4 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div
        className={`max-w-7xl mx-auto px-6 py-8 transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor orders, drivers, and system performance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                    <div className="text-3xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse bg-gray-200 h-8 w-16 rounded inline-block"></span>
                      ) : (
                        dashboardStats.totalOrders?.toLocaleString() || '0'
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Drivers</p>
                    <div className="text-3xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse bg-gray-200 h-8 w-16 rounded inline-block"></span>
                      ) : (
                        dashboardStats.activeDrivers?.toLocaleString() || '0'
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Revenue</p>
                    <div className="text-3xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse bg-gray-200 h-8 w-16 rounded inline-block"></span>
                      ) : (
                        `₱${dashboardStats.revenue?.toFixed(2) || '0.00'}`
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

            </div>

            {/* Send Order Form Card (replaces Generate Tracking ID) */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Plus className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Send Order Form</h2>
                  <p className="text-sm text-gray-600">
                    Email order form link to client
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-2">Client Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendForm}
                    disabled={loading}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-5 w-5" />
                        Send Form
                      </>
                    )}
                  </button>
                </div>

                {/* Form status / error */}
                {formStatus && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">{formStatus}</span>
                    </div>
                    {generatedTrackingId && (
                      <p className="mt-2 text-sm text-gray-700">
                        Generated Temporary Code: <code className="font-mono">{generatedTrackingId}</code>
                      </p>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {formError}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  The client will receive an email with a link to proceed. The link will expire in 1
                  hour.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Export Data for Power BI */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Export Data</h2>
              </div>

              {exportSuccess && (
                <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <span className="text-sm text-green-800">{exportSuccess}</span>
                </div>
              )}

              {exportError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-sm text-red-800">{exportError}</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => handleExport('orders')}
                  disabled={exportLoading !== null}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {exportLoading === 'orders' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Orders
                </button>

                <button
                  onClick={() => handleExport('clients')}
                  disabled={exportLoading !== null}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {exportLoading === 'clients' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Clients
                </button>

                <button
                  onClick={() => handleExport('inventory')}
                  disabled={exportLoading !== null}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {exportLoading === 'inventory' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Inventory
                </button>

                <button
                  onClick={() => handleExport('drivers')}
                  disabled={exportLoading !== null}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {exportLoading === 'drivers' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Drivers
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Export data as Excel files for Power BI analysis
              </p>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Services</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Service</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  )
}
