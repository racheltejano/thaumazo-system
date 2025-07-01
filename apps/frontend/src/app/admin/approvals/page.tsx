'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'

interface User {
  id: string
  email: string
}

export default function AdminApprovalsPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      fetchUnapprovedUsers()
    }

    checkAdminAndFetch()
  }, [router])

  const fetchUnapprovedUsers = async () => {
    const { data, error } = await supabase.rpc('get_unapproved_users')
    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const handleApprove = async (userId: string) => {
    const role = selectedRoles[userId]
    if (!role) {
      alert('Please select a role before approving.')
      return
    }

    const { error } = await supabase.from('profiles').insert({
      id: userId,
      role: role,
    })

    if (error) {
      alert('Error approving user: ' + error.message)
    } else {
      setUsers(users.filter(u => u.id !== userId))
    }
  }

  const handleDeny = async (userId: string) => {
    setUsers(users.filter(u => u.id !== userId))
    // Optionally delete the user from auth
  }

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">🧾 Pending User Approvals</h2>

          {loading ? (
            <p className="text-gray-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500">No pending users.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-black">
                <thead>
                  <tr className="bg-gray-100 text-black">
                    <th className="px-4 py-2 text-left font-semibold">📧 Email</th>
                    <th className="px-4 py-2 text-left font-semibold">🔐 Role</th>
                    <th className="px-4 py-2 text-left font-semibold">✅ Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0 hover:bg-orange-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className="px-2 py-1 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 text-black"
                          value={selectedRoles[user.id] || ''}
                          onChange={e =>
                            setSelectedRoles({
                              ...selectedRoles,
                              [user.id]: e.target.value
                            })
                          }
                        >
                          <option value="">-- Select Role --</option>
                          <option value="admin">Admin</option>
                          <option value="driver">Driver</option>
                          <option value="dispatcher">Dispatcher</option>
                          <option value="inventory_staff">Inventory Staff</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(user.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                        >
                          Deny
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
