'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Not logged in, redirect to client login
        router.push('/client/login')
        return
      }

      // Check if user has a client profile
      const { data: clientProfile, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !clientProfile) {
        // User exists but no client profile, check if they need to complete profile
        if (user.email_confirmed_at) {
          router.push('/client/complete-profile')
        } else {
          router.push('/client/confirm-email')
        }
        return
      }

      // User has client profile, redirect to client dashboard
      router.push('/client/dashboard')
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
} 