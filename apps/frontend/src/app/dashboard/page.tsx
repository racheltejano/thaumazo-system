'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchMe } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  type Profile = {
    id: string
    first_name?: string
    last_name?: string
    role: 'admin' | 'driver' | 'dispatcher' | 'inventory_staff'
    contact_number?: string
    email?: string
  }

const [profile, setProfile] = useState<Profile | null>(null)
const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      console.log('[Dashboard] Loading user...')
      try {
        console.log('[Dashboard] Calling fetchMe...')
        const user = await fetchMe()
        console.log('[Dashboard] fetchMe result:', user)
        setProfile(user)

        // Redirect based on role
        switch (user.role) {
          case 'admin':
            console.log('[Dashboard] Redirecting to /admin')
            router.push('/admin')
            break
          case 'driver':
            console.log('[Dashboard] Redirecting to /driver')
            router.push('/driver')
            break
          case 'dispatcher':
            console.log('[Dashboard] Redirecting to /dispatcher')
            router.push('/dispatcher')
            break
          case 'inventory_staff':
            console.log('[Dashboard] Redirecting to /inventory')
            router.push('/inventory')
            break
          default:
            console.log('[Dashboard] Redirecting to /dashboard')
            router.push('/dashboard')
        }
      } catch (err) {
        console.error('[Dashboard] Error in fetchMe or not authenticated:', err)
        router.push('/login')
      } finally {
        setLoading(false)
        console.log('[Dashboard] Loading finished.')
      }
    }
    loadUser()
  }, [router])

  if (loading) return <p>Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">
        Welcome, {(profile?.first_name || "") + (profile?.last_name ? ` ${profile.last_name}` : "") || profile?.email}!
      </h1>
      <p>You&apos;re logged in as <strong>{profile?.role}</strong>.</p>
    </div>
  )
}
