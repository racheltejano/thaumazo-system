/**
 * 🔑 Login Page
 * 
 * This client-side page lets users sign in using their email and password through Supabase.
 * It checks if the user’s account is allowed to log in, remembers the email if requested,
 * and redirects logged-in users to the dashboard.
 * 
 * ⚙️ Main Function:
 * - `LoginPage()`: Handles user login, remembers email, and redirects on success.
 * 
 * 🧩 Features:
 * - Validates user credentials
 * - Checks `can_login` status in the `profiles` table
 * - Updates `last_login` timestamp
 * - Supports “Remember Me” functionality
 * - Redirects existing sessions to `/dashboard`
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
  const savedEmail = localStorage.getItem('remembered-email')
  if (savedEmail) {
    setEmail(savedEmail)
    setRememberMe(true)
  }

  const checkIfLoggedIn = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      router.push('/dashboard')
    }
  }

  checkIfLoggedIn()
}, [router]) // ✅ include router here


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

    // 🔐 Fetch the user's profile to check can_login
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('can_login')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      setError('Unable to verify account access. Please try again later.')
      return
    }

    if (!profile?.can_login) {
      await supabase.auth.signOut()
      setError('Your account has been disabled. Please contact the administrator if you believe this is a mistake.')
      return
    }

    // Update last_login timestamp
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)

    // ✅ Remember email if needed
    if (rememberMe) {
      localStorage.setItem('remembered-email', email)
    } else {
      localStorage.removeItem('remembered-email')
    }
    // --- FIX: Refresh AuthContext before redirect ---
    if (auth && auth.refresh) {
      await auth.refresh();
    }
    router.push('/dashboard')
  } catch (err) {
    console.error('Login error:', err)
    setError('Something went wrong. Please try again.')
  }
}


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex space-x-6 mb-4 justify-center">
        <span className="font-bold border-b-2 border-orange-500 text-orange-600">SIGN IN</span>
        <Link href="/register" className="text-gray-500 hover:text-orange-500">SIGN UP</Link>
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
        <Link href="/forgot-password" className="text-orange-500 hover:underline">Forgot Password?</Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded">
        Sign In
      </button>

      <Link href="/track" className="block text-center text-sm text-gray-500 hover:text-orange-600 mt-2">
        I have a tracking code
      </Link>
    </form>
  )
}
