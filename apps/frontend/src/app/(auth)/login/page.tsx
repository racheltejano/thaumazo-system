'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only run on the client
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('remembered-email')
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!email || !password) {
        setError('Please enter both email and password.')
        return
      }

      const response = await api.post('/auth/login', { 
        email, 
        password 
      })
      
      if (response.status === 200 || response.status === 201) {
        if (rememberMe) {
          localStorage.setItem('remembered-email', email)
        } else {
          localStorage.removeItem('remembered-email')
        }
        router.replace('/dashboard')
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || 'Invalid email or password.')
    } finally {
      setIsLoading(false)
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
        className="w-full p-2 border rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
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
        <Link href="/forgot-password" className="text-orange-500 hover:underline">Forgot Password?</Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button 
        type="submit" 
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </button>

      <Link href="/track" className="block text-center text-sm text-gray-500 hover:text-orange-600 mt-2">
        I have a tracking code
      </Link>
    </form>
  )
}
