'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function InventoryDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dashboard') // not logged in
        return
      }

      setUser(user)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        router.push('/dashboard')
        return
      }

      if (profile.role !== 'inventory_staff') {
        router.push('/dashboard') // not the right role
        return
      }

      setRole(profile.role)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p>Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">🏷️ Inventory Staff Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome! Manage warehouse stock and incoming/outgoing deliveries here.
      </p>
      
      <button
        onClick={handleLogout}
        className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
      >
        Log Out
      </button>
    </div>
  )
}
