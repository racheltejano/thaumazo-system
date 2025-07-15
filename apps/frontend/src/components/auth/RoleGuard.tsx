'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'

type RoleGuardProps = {
  requiredRole: string
  children: React.ReactNode
}

export default function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  const { user, role, loading, error, refresh } = useAuth();
  const [status, setStatus] = useState<'checking' | 'unauthorized' | 'redirecting' | 'authorized'>('checking')
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      setStatus('checking')
      return
    }
    if (error) {
      toast.error('Error checking access: ' + error)
      setStatus('unauthorized')
      return
    }
    if (!user) {
      toast.error('🔒 You must be logged in to access this page.')
      setStatus('redirecting')
      setTimeout(() => {
        router.replace('/')
      }, 2000)
      return
    }
    if (role !== requiredRole) {
      toast.warning('⚠️ You do not have permission to view this page.')
      setStatus('redirecting')
      setTimeout(() => {
        router.replace('/dashboard')
      }, 2000)
      return
    }
    setStatus('authorized')
  }, [user, role, loading, error, requiredRole, router])

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-orange-500 text-xl font-semibold mb-4">🔐 Checking your access...</p>
        <div className="mt-4 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  if (status === 'redirecting') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-red-600 text-xl font-semibold mb-4">🚫 Access denied</p>
        <p className="text-gray-500">Redirecting you to the appropriate page...</p>
        <div className="mt-6 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  if (status === 'authorized') {
    return <>{children}</>
  }

  return null
}