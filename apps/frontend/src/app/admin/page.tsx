'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error.message)
    } else {
      router.push('/login')
    }
  }

  const goToApprovals = () => {
    router.push('/admin/approvals')
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">👩‍💼 Admin Dashboard</h1>
      <p className="text-gray-700">Welcome, Admin! You have full access to the system.</p>

      <div className="space-x-4">
        <button
          onClick={goToApprovals}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔎 View Pending Approvals
        </button>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          🔒 Logout
        </button>
      </div>
    </div>
  )
}
