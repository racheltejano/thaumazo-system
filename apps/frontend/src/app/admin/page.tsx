'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Plus, Users, Package, ClipboardList, Settings, RefreshCw, Copy, Check, Mail, AlertCircle, X } from 'lucide-react'

function generateTrackingId(prefix = 'TXT') {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}_${random}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [trackingId, setTrackingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [recentTrackingIds, setRecentTrackingIds] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const auth = useAuth()
  const user = auth?.user
  const role = auth?.role
  const authLoading = auth?.loading

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: null as number | null,
    activeDrivers: null as number | null,
    revenue: null as number | null,
    pendingApprovals: null as number | null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
      if (authLoading || !user || role !== 'admin') return;
      
      setStatsLoading(true);
      
      try {
        // Get total orders
        const { count: totalOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        
        // Get active drivers
        const { count: activeDrivers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('can_login', true);
        
        // Get revenue from delivered orders
        const { data: deliveredOrders } = await supabase
          .from('orders')
          .select('estimated_cost')
          .eq('status', 'delivered');
        const revenue = deliveredOrders?.reduce((sum, order) => sum + Number(order.estimated_cost || 0), 0) || 0;
        
        // Get pending approvals count
        const { data: pendingApprovals } = await supabase.rpc('get_unapproved_users');
        const pendingCount = pendingApprovals?.length || 0;
        
        setDashboardStats({
          totalOrders: totalOrders ?? 0,
          activeDrivers: activeDrivers ?? 0,
          revenue: revenue,
          pendingApprovals: pendingCount,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setDashboardStats({
          totalOrders: 0,
          activeDrivers: 0,
          revenue: 0,
          pendingApprovals: 0,
        });
      }
      
      setStatsLoading(false);
    };
    
    fetchStats();
  }, [authLoading, user, role]);

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopied(false)
    setEmail('')
    setEmailStatus('')

    const id = generateTrackingId()

    try {
      const { error } = await supabase.from('clients').insert({
        tracking_id: id,
        contact_person: 'Pending',
        contact_number: 'Pending',
        pickup_address: 'Pending',
      })

      if (error) {
        setError(error.message)
      } else {
        setTrackingId(id)
        setRecentTrackingIds(prev => [id, ...prev.slice(0, 4)]) // Keep last 5
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate tracking ID')
    }

    setLoading(false)
  }

  const handleCopy = (idToCopy = trackingId) => {
    navigator.clipboard.writeText(idToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

const handleSendEmail = async () => {
  if (!email.trim()) {
    setEmailStatus('Please enter an email address.')
    return
  }

  if (!validateEmail(email)) {
    setEmailStatus('Please enter a valid email address.')
    return
  }

  if (!trackingId) {
    setEmailStatus('No tracking ID to send.')
    return
  }

  setEmailLoading(true)
  setEmailStatus('Sending email...')

  try {
    // Updated to use the correct API route path
    const response = await fetch('/api/send-tracking-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        trackingId: trackingId 
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send email')
    }

    setEmailStatus('✅ Email sent successfully!')
    setEmail('')
    
    // Clear success message after 5 seconds
    setTimeout(() => setEmailStatus(''), 5000)
    
  } catch (err: any) {
    console.error('Email sending error:', err)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email.'
    
    if (err.message?.includes('not configured')) {
      errorMessage = 'Email service not configured. Please contact your administrator.'
    } else if (err.message?.includes('Invalid email')) {
      errorMessage = 'Please enter a valid email address.'
    } else if (err.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.'
    } else if (err.message) {
      errorMessage = err.message
    }
    
    setEmailStatus(`❌ ${errorMessage}`)
  } finally {
    setEmailLoading(false)
  }
}
  const clearEmailStatus = () => {
    setEmailStatus('')
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
          isVisible 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-8'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Orders Card */}
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

              {/* Active Drivers Card */}
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

              {/* Revenue Card */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Revenue</p>
                    <div className="text-3xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse bg-gray-200 h-8 w-16 rounded inline-block"></span>
                      ) : (
                        `$${dashboardStats.revenue?.toFixed(2) || '0.00'}`
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Pending Approvals Card */}
              <div className={`bg-white rounded-xl shadow-md p-6 border ${dashboardStats.pendingApprovals !== null && dashboardStats.pendingApprovals > 0 ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</p>
                    {statsLoading ? (
                      <span className="animate-pulse bg-gray-200 h-8 w-16 rounded inline-block"></span>
                    ) : dashboardStats.pendingApprovals === 0 ? (
                      <p className="text-xs text-green-600">✓ All clear</p>
                    ) : (
                      <p className={`text-3xl font-bold text-red-600`}>
                        {dashboardStats.pendingApprovals?.toLocaleString() || '0'}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${dashboardStats.pendingApprovals !== null && dashboardStats.pendingApprovals > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <AlertCircle className={`h-6 w-6 ${dashboardStats.pendingApprovals !== null && dashboardStats.pendingApprovals > 0 ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Tracking ID Card */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Plus className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Generate Tracking ID</h2>
                  <p className="text-sm text-gray-600">Create a new tracking ID for client orders</p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Generate New Tracking ID
                    </>
                  )}
                </button>

                {showSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">Tracking ID generated successfully!</span>
                    </div>
                  </div>
                )}

                {trackingId && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-3">Generated Tracking ID:</p>
                    <div className="flex items-center gap-3">
                      <code className="bg-white px-4 py-3 rounded-lg border text-lg font-mono flex-1">
                        {trackingId}
                      </code>
                      <button
                        onClick={() => handleCopy(trackingId)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Recent Tracking IDs */}
                {recentTrackingIds.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Tracking IDs</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {recentTrackingIds.map((id, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                          <code className="text-sm font-mono text-gray-700">{id}</code>
                          <button
                            onClick={() => handleCopy(id)}
                            className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Section */}
                {trackingId && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Tracking ID via Email
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                          placeholder="Enter email address"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          disabled={emailLoading}
                        />
                        <button
                          onClick={handleSendEmail}
                          disabled={emailLoading}
                          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          {emailLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send'
                          )}
                        </button>
                      </div>
                      
                      {emailStatus && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                          <p className="text-sm text-blue-700">{emailStatus}</p>
                          <button
                            onClick={clearEmailStatus}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/admin/orders')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-full font-medium transition-colors flex items-center gap-3 shadow-sm hover:shadow-md"
                >
                  <ClipboardList className="h-4 w-4" />
                  View All Orders
                </button>
                <button 
                  onClick={() => router.push('/admin/staff')}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-full font-medium transition-colors flex items-center gap-3 shadow-sm hover:shadow-md"
                >
                  <Users className="h-4 w-4" />
                  Manage Staff
                </button>
                <button 
                  onClick={() => router.push('/admin/inventory')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-full font-medium transition-colors flex items-center gap-3 shadow-sm hover:shadow-md"
                >
                  <Package className="h-4 w-4" />
                  Inventory Check
                </button>
                <button 
                  onClick={() => router.push('/admin/approvals')}
                  className={`w-full py-3 px-4 rounded-full font-medium transition-colors flex items-center gap-3 shadow-sm hover:shadow-md ${
                    dashboardStats.pendingApprovals !== null && dashboardStats.pendingApprovals > 0
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  Review Approvals
                  {dashboardStats.pendingApprovals !== null && dashboardStats.pendingApprovals > 0 && (
                    <span className="ml-auto bg-white text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                      {dashboardStats.pendingApprovals}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => router.push('/admin/settings')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-full font-medium transition-colors flex items-center gap-3 shadow-sm hover:shadow-md"
                >
                  <Settings className="h-4 w-4" />
                  System Settings
                </button>
              </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString()}
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