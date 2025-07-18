'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSummaryCard from '@/components/AdminSummaryCard/page'
import { useAuth } from '@/lib/AuthContext';

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
  const auth = useAuth();
    useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dashboard')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setLoadingAuth(false)
    }

    checkAccess()
  }, [router])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopied(false)
    setEmail('')
    setEmailStatus('')

    const id = generateTrackingId()

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
    }

    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    setEmailStatus('Sending...')
    try {
      const res = await fetch('/api/send-tracking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trackingId }),
      })
      const result = await res.json()
      if (result.success) {
        setEmailStatus('✅ Email sent successfully!')
      } else {
        setEmailStatus('❌ Failed to send email.')
      }
    }  catch (e) {
      console.error(e)
      setEmailStatus('❌ An error occurred while sending.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh();
    }
    router.push('/login');
  }

   return (
    <main className="px-6 py-10 space-y-16 bg-[#f9fafb]">
        {/* 📊 Overview + ⚠️ Inventory Alerts */}
        {/* 📊 Dashboard Summary, Inventory Alerts, and Today’s Orders */}  
<h2 className="text-2xl font-bold text-gray-800">📊 Dashboard Overview</h2>
<section className="grid gap-6 lg:grid-cols-4">
  {/* 📊 Dashboard Summary Cards */}
  <div className="lg:col-span-2 space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <AdminSummaryCard title="Unassigned Orders" value="5" icon="📦" />
      <AdminSummaryCard title="Deliveries In Progress" value="8" icon="🚚" />
      <AdminSummaryCard title="Completed Today" value="12" icon="✅" />
      <AdminSummaryCard title="Low Inventory Items" value="3" icon="📉" />
      <AdminSummaryCard title="Active Drivers" value="4" icon="🧑‍✈️" />
      <AdminSummaryCard title="Scheduled Today" value="9" icon="📅" />
      <AdminSummaryCard title="Issues Flagged" value="1" icon="🆘" />
      <AdminSummaryCard title="Avg Delivery Time" value="2h 35m" icon="⏱️" />
      <AdminSummaryCard title="Cancelled Orders" value="2" icon="❌" />
    </div>
  </div>

  {/* ⚠️ Inventory Alerts */}
  <aside className="bg-white border border-red-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
    <h2 className="text-lg font-bold text-gray-700">⚠️ Inventory Alerts</h2>
    <ul className="divide-y divide-red-100 text-sm">
      {[
        { name: 'Bubble Wrap', quantity: 4 },
        { name: 'Small Cartons', quantity: 2 },
        { name: 'Packing Tape', quantity: 5 },
      ].map((item, index) => (
        <li key={index} className="py-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-500">Remaining: {item.quantity} units</p>
            </div>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-1 rounded-full">
              LOW
            </span>
          </div>
        </li>
      ))}
    </ul>
  </aside>

  {/* 📅 Orders Scheduled Today */}
  <aside className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm h-fit space-y-4">
    <h2 className="text-lg font-bold text-gray-700">📅 Scheduled Today</h2>
    <ul className="divide-y divide-gray-100 text-sm">
      {[
        { id: 'ORD004', client: 'Michael Reyes', time: '9:00 AM' },
        { id: 'ORD005', client: 'Sarah Cruz', time: '11:30 AM' },
        { id: 'ORD006', client: 'Brian Lim', time: '3:45 PM' },
      ].map((order, index) => (
        <li key={index} className="py-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{order.client}</p>
              <p className="text-xs text-gray-500">{order.id} • {order.time}</p>
            </div>
            <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
              Scheduled
            </span>
          </div>
        </li>
      ))}
    </ul>
  </aside>
</section>


        {/* 📦 Orders + 🎯 Tracking */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* 📝 Recent Orders */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">📝 Recent Orders</h3>
            <div className="overflow-x-auto shadow-md border border-gray-200 rounded-xl">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">Order ID</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'ORD001', client: 'Juan Dela Cruz', status: 'Unassigned', scheduled: 'July 17' },
                    { id: 'ORD002', client: 'Ana Reyes', status: 'In Transit', scheduled: 'July 17' },
                    { id: 'ORD003', client: 'Pedro Santos', status: 'Completed', scheduled: 'July 16' },
                  ].map((order) => (
                    <tr key={order.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{order.id}</td>
                      <td className="px-4 py-2">{order.client}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'Unassigned' ? 'bg-red-100 text-red-600' :
                          order.status === 'In Transit' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{order.scheduled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🎯 Generate Tracking ID */}
          <div className="bg-white shadow-md border border-gray-200 rounded-xl p-6 space-y-5">
            <h2 className="text-xl font-semibold text-orange-600">🎯 Generate Tracking ID</h2>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium"
            >
              {loading ? 'Generating...' : 'Generate ID'}
            </button>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            {trackingId && (
              <>
                <div className="text-sm">
                  <p className="text-gray-700 font-medium">Tracking ID:</p>
                  <div className="flex items-center mt-1">
                    <code className="bg-gray-100 border px-3 py-1 rounded text-orange-700 font-semibold text-sm">{trackingId}</code>
                    <button
                      onClick={handleCopy}
                      className="ml-2 text-sm bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">📨 Send to Client</h3>
                  <input
                    type="email"
                    placeholder="Client email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border p-2 rounded text-sm mb-2"
                  />
                  <button
                    onClick={handleSendEmail}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded"
                  >
                    Send Email
                  </button>
                  {emailStatus && <p className="text-xs mt-2 text-gray-500">{emailStatus}</p>}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 👷 Driver Status */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">🧑‍✈️ Driver Status Overview</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[
              { name: 'Driver A', status: 'On-duty', color: 'green' },
              { name: 'Driver B', status: 'On-duty', color: 'green' },
              { name: 'Driver C', status: 'Off-duty', color: 'red' },
              { name: 'Driver D', status: 'Pending', color: 'yellow' },
            ].map((driver, index) => (
              <div
                key={index}
                className={`border-l-4 border-${driver.color}-500 bg-white shadow p-4 rounded-lg`}
              >
                <h4 className="text-gray-800 font-medium">{driver.name}</h4>
                <p className={`text-sm text-${driver.color}-600`}>{driver.status}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 🗺️ Delivery Heatmap */}
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">📍 Delivery Heatmap</h3>
          <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm">
            [Map Preview Placeholder – Coming Soon]
          </div>
        </section>
      </main>
  )
}
