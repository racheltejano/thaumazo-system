'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useAuth } from '@/lib/AuthContext'

export default function DashboardPage() {
  const router = useRouter()
  const auth = useAuth();
  const [loading, setLoading] = useState(true)
  
  type Profile = {
    id: string
    first_name?: string
    last_name?: string
    role: 'admin' | 'driver' | 'dispatcher' | 'inventory_staff'
    contact_number?: string
  }

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!auth || auth.loading) {
      setLoading(true)
      return
    }
    setLoading(false)

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        router.push('/awaiting-approval')
        return
      }

      setProfile(profileData)

      // Redirect based on role from AuthContext
      if (auth.role) {
        switch (auth.role) {
        case 'admin':
            router.push('/admin')
            break
        case 'driver':
            router.push('/driver')
            break
        case 'dispatcher':
            router.push('/dispatcher')
            break
        case 'inventory_staff':
            router.push('/inventory/dashboard')
            break
        default:
            router.push('/dashboard')
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [router, auth])

  if (loading) return <p>Loading...</p>

  return (
  <div className="p-6">
    <h1 className="text-xl font-bold">Welcome, {(profile?.first_name || "") + (profile?.last_name ? ` ${profile.last_name}` : "") || user?.email}!</h1>
    <p>You&apos;re logged in as <strong>{auth?.role}</strong>.</p>
  </div>
)
}