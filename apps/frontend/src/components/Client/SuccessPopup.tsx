'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function SuccessPopup({ trackingId }: { trackingId: string }) {
  const router = useRouter()

  useEffect(() => {
    toast.success('✅ Order submitted successfully!')
    const timer = setTimeout(() => {
      router.push(`/track/${trackingId}`)
    }, 2000)

    return () => clearTimeout(timer)
  }, [trackingId, router])

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <p className="text-green-600 text-2xl font-bold mb-4">✅ Order Created!</p>
      <p className="text-gray-500">Redirecting to your order tracking page...</p>
      <div className="mt-6 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
    </div>
  )
}
