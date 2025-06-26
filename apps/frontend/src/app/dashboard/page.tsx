'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    })
  }, [router])

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>
      <button
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
      >
        Logout
      </button>
    </div>
  )
}
