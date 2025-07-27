'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientConfirmEmailPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    const checkEmailConfirmed = async () => {
      setChecking(true)
      setError('')
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        setError('Could not check email confirmation. Please try again.')
        setChecking(false)
        return
      }
      if (user && user.email_confirmed_at) {
        router.push('/client/complete-profile')
      }
      setChecking(false)
    }
    // Check immediately, then every 5 seconds
    checkEmailConfirmed()
    interval = setInterval(checkEmailConfirmed, 5000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-16 px-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full text-center max-h-[500px]">
        <h1 className="text-2xl font-bold mb-3 text-orange-600">Confirm Your Email</h1>
        <p className="mb-3 text-gray-700">
          We&apos;ve sent a confirmation link to your email address.
          Please check your inbox and click the link to verify your account.
        </p>
        <div className="flex items-center justify-center mb-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
        <p className="text-gray-500 text-sm mb-2">Waiting for email confirmation...</p>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          className="mt-2 text-orange-500 hover:underline text-sm"
          onClick={() => window.location.reload()}
        >
          Refresh Now
        </button>
      </div>
    </div>
  )
} 