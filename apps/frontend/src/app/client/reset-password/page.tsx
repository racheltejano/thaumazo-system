'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ClientResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if user is authenticated (they should be after clicking reset link)
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/client/login')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError('Failed to update password. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
        <p className="text-gray-600 mt-2">Enter your new password below.</p>
      </div>

      {success ? (
        <div className="space-y-4 text-center">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800">
              Password updated successfully! You can now sign in with your new password.
            </p>
          </div>
          <button
            onClick={() => router.push('/client/login')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded"
          >
            Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              className="w-full p-2 border rounded pr-10 text-gray-800 placeholder-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              className="w-full p-2 border rounded pr-10 text-gray-800 placeholder-gray-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
              onClick={() => setShowConfirmPassword((v) => !v)}
              tabIndex={-1}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          <div className="text-center">
            <Link href="/client/login" className="text-orange-500 hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  )
} 