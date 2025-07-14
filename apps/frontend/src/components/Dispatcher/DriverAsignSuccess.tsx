'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function DriverAssignSuccess({
  onDone,
}: {
  onDone: () => void
}) {
  useEffect(() => {
    toast.success('✅ Driver successfully assigned!')
    const timer = setTimeout(() => {
      onDone()
    }, 1500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl shadow-xl text-center w-[90%] max-w-sm">
        <div className="text-4xl text-green-600 mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-700 mb-2">Driver Assigned!</h2>
        <p className="text-gray-500 text-sm mb-4">Refreshing the calendar...</p>
        <div className="mx-auto h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    </div>
  )
}
