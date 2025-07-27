'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import Image from 'next/image'

export default function ClientLoginPage() {
  const router = useRouter()
  const auth = useAuth();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('client-remembered-email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    const checkIfLoggedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if user has a client profile
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (clientProfile) {
          router.push('/client/dashboard')
        } else {
          // User exists but no client profile, check if they need to complete profile
          if (user.email_confirmed_at) {
            router.push('/client/complete-profile')
          } else {
            router.push('/client/confirm-email')
          }
        }
      }
    }

    checkIfLoggedIn()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Invalid email or password.')
      return
    }

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

      if (loginError || !data.user) {
        setError('Invalid email or password.')
        return
      }

      // Check if user has a client profile
      const { data: clientProfile, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (clientError || !clientProfile) {
        // User doesn't have a client profile yet
        if (data.user.email_confirmed_at) {
          // Email is confirmed, redirect to complete profile
          router.push('/client/complete-profile')
        } else {
          // Email not confirmed, redirect to confirm email
          router.push('/client/confirm-email')
        }
        return
      }

      // User has client profile, proceed to dashboard
      // Remember email if needed
      if (rememberMe) {
        localStorage.setItem('client-remembered-email', email)
      } else {
        localStorage.removeItem('client-remembered-email')
      }

      // Refresh AuthContext before redirect
      if (auth && auth.refresh) {
        await auth.refresh();
      }
      
      router.push('/client/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Please try again.')
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-6 mb-4 justify-center">
              <span className="font-bold border-b-2 border-orange-500 text-orange-600">SIGN IN</span>
              <Link href="/client/register" className="text-gray-500 hover:text-orange-500">SIGN UP</Link>
            </div>

            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded text-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox text-orange-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-gray-700">Remember Me</span>
              </label>
              <Link href="/client/forgot-password" className="text-orange-500 hover:underline">Forgot Password?</Link>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded">
              Sign In
            </button>

            <div className="text-center">
              <Link href="/track" className="block text-sm text-gray-500 hover:text-orange-600">
                I have a tracking code
              </Link>
            </div>
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