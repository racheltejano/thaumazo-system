/**
 * 🔑 Login Page
 * 
 * This client-side page lets users sign in using their email and password through Supabase.
 * It checks if the user's account is allowed to log in, remembers the email if requested,
 * and redirects logged-in users to the dashboard or profile setup if needed.
 * 
 * ⚙️ Main Function:
 * - `LoginPage()`: Handles user login, remembers email, and redirects on success.
 * 
 * 🧩 Features:
 * - Validates user credentials
 * - Checks `can_login` status in the `profiles` table
 * - Checks if profile setup is required (for admin-created accounts)
 * - Updates `last_login` timestamp
 * - Supports "Remember Me" functionality
 * - Redirects existing sessions to appropriate page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered-email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    const checkIfLoggedIn = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user needs profile setup
        const needsSetup = await checkProfileSetup(user.id)
        if (needsSetup) {
          router.push('/setup-profile')
        } else {
          router.push('/dashboard')
        }
      }
    }

    checkIfLoggedIn()
  }, [router])

  /**
   * Check if user needs to complete profile setup
   */
  const checkProfileSetup = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('needs_profile_setup', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error checking profile setup:', error)
        return false
      }

      if (data && data.length > 0) {
        return data[0].needs_setup || false
      }

      return false
    } catch (err) {
      console.error('Unexpected error checking profile setup:', err)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Invalid email or password.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (loginError || !data.user) {
        setError('Invalid email or password.')
        setIsLoading(false)
        return
      }

      // 🔐 Fetch the user's profile to check can_login
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('can_login, created_by_admin, profile_completed, temp_password_changed')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        setError('Unable to verify account access. Please try again later.')
        setIsLoading(false)
        return
      }

      // Check if account is disabled
      if (!profile?.can_login) {
        await supabase.auth.signOut()
        setError('Your account has been disabled. Please contact the administrator if you believe this is a mistake.')
        setIsLoading(false)
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

      // Refresh AuthContext before redirect
      if (auth && auth.refresh) {
        await auth.refresh()
      }

      // ✨ NEW: Check if user needs profile setup
      const needsSetup = profile.created_by_admin && 
                        (!profile.profile_completed || !profile.temp_password_changed)

      if (needsSetup) {
        router.push('/setup-profile')
      } else {
        router.push('/dashboard')
      }
      
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 text-center">
        <span className="font-bold text-orange-600 text-xl">SIGN IN</span>
      </div>

      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 border rounded text-gray-800"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded text-gray-800"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />

      <div className="flex justify-between items-center text-sm">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            className="form-checkbox text-orange-500"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span className="text-gray-700">Remember Me</span>
        </label>
        <Link href="/forgot-password" className="text-orange-500 hover:underline">
          Forgot Password?
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </button>

      <Link href="/track" className="block text-center text-sm text-gray-500 hover:text-orange-600 mt-2">
        I have a tracking code
      </Link>
    </form>
  )
}