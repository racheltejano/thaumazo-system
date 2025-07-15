'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext';

export default function DispatcherDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const auth = useAuth();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh();
    }
    router.push('/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📦 Dispatcher Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome, Dispatcher! View and assign deliveries here.
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
