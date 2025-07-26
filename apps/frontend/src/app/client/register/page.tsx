'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function ClientRegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if user has a client account
        const { data: clientAccount } = await supabase
          .from('client_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (clientAccount) {
          router.push('/client/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    }

    checkIfLoggedIn()
  }, [router])

  function validate() {
    const errs: { [key: string]: string } = {}
    
    if (!email) errs.email = 'Email cannot be blank'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email is invalid'
    
    if (!password) errs.password = 'Password cannot be blank'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      
      if (error) {
        setErrors({ email: 'Registration failed. Please try again.' })
        setLoading(false)
        return
      }
      router.push('/client/confirm-email')
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ email: 'Registration failed. Please try again.' })
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-6">
      {/* LEFT SIDE: Logo + content box */}
      <div className="w-full md:w-1/2 max-w-md space-y-6">
        <div className="flex flex-col items-center">
          <Image src="/texts-logo.png" alt="TEXTS Logo" width={300} height={100} className="mb-2 select-none" />
          <p className="text-sm text-gray-600 -mt-2 text-center select-none">
            <span className="font-bold text-orange-500">T</span>haumazo{' '}
            <span className="font-bold text-orange-500">EX</span>press{' '}
            <span className="font-bold text-orange-500">T</span>ransport{' '}
            <span className="font-bold text-orange-500">S</span>olutions{' '}
          </p>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Portal</h1>
            <p className="text-sm text-gray-600">Access your account and manage your shipments</p>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow p-6 select-none">
          {/* Tab Navigation */}
          <div className="flex space-x-6 mb-4 justify-center">
            <Link href="/client/login" className="text-gray-500 hover:text-orange-500">SIGN IN</Link>
            <span className="font-bold border-b-2 border-orange-500 text-orange-600">SIGN UP</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              className={`w-full p-2 border rounded text-gray-800 placeholder-gray-500 ${errors.email ? 'border-red-500' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className={`w-full p-2 border rounded pr-10 text-gray-800 placeholder-gray-500 ${errors.password ? 'border-red-500' : ''}`}
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
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>

            <p className="text-sm text-center text-gray-500">
              Already have an account?{' '}
              <Link href="/client/login" className="text-orange-500 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE: Avatar image */}
      <div className="hidden md:flex md:w-1/2 justify-center items-center">
        <Image
          src="/texts-avatars.png"
          alt="TEXTS Team Avatars"
          width={900}
          height={700}
          className="object-contain"
        />
      </div>
    </main>
  )
} 