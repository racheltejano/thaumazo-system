'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
        router.push('/dashboard') // redirect non-admins
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
    // Optional: Call backend route to delete auth user
  }

  if (loading) return <p className="p-4">Loading users...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🧾 Pending User Approvals</h1>

      {users.length === 0 ? (
        <p>No pending users!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">📧 Email</th>
                <th className="px-4 py-2">🔐 Role</th>
                <th className="px-4 py-2">✅ Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="border p-1 rounded"
                      value={selectedRoles[user.id] || ''}
                      onChange={e =>
                        setSelectedRoles({ ...selectedRoles, [user.id]: e.target.value })
                      }
                    >
                      <option value="">-- Select Role --</option>
                      <option value="admin">Admin</option>
                      <option value="driver">Driver</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="inventory_staff">Inventory Staff</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(user.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
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
  )
}
