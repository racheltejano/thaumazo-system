'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
}

export default function AdminApprovalsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchUnapprovedUsers()
  }, [])

  const fetchUnapprovedUsers = async () => {
  const { data, error } = await supabase.from('unapproved_users').select('*')

  if (error) {
    console.error('Error fetching users:', error)
  } else {
    setUsers(data)
  }

  setLoading(false)
}


  const handleApprove = async (userId: string) => {
    const role = selectedRoles[userId]
    if (!role) return alert('Please select a role.')

    const { error } = await supabase.from('profiles').insert({
      id: userId,
      full_name: 'Pending Name', // you can customize this later
      role: role,
    })

    if (error) {
      alert('Error approving user: ' + error.message)
    } else {
      setUsers(users.filter(user => user.id !== userId))
    }
  }

  if (loading) return <p className="p-4">Loading users...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧾 Pending User Approvals</h1>
      {users.length === 0 ? (
        <p>No pending users!</p>
      ) : (
        <ul className="space-y-4">
          {users.map(user => (
            <li key={user.id} className="border p-4 rounded shadow">
              <p className="font-semibold">📧 {user.email}</p>
              <select
                className="mt-2 border p-1 rounded"
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
              <button
                className="ml-4 px-3 py-1 bg-green-600 text-white rounded"
                onClick={() => handleApprove(user.id)}
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
