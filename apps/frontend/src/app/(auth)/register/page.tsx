'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')

  function validate() {
    const errs: { [key: string]: string } = {}
    if (!email) errs.email = 'Email cannot be blank'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email is invalid'
    if (!password) errs.password = 'Password cannot be blank'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (!name) errs.name = 'Name cannot be blank'
    if (!role) errs.role = 'Role cannot be blank'
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
      const response = await api.post('/auth/register', { email, password, name, role })
      if (response.data && !response.data.error) {
        setSuccess(true)
      } else {
        setErrors({ email: 'Registration failed. Please try again.' })
      }
    } catch (err: any) {
      setErrors({ email: err.response?.data?.message || 'Registration failed. Please try again.' })
    }
    setLoading(false)
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex space-x-6 mb-4 justify-center">
        <Link href="/login" className="text-gray-500 hover:text-orange-500">SIGN IN</Link>
        <span className="font-bold border-b-2 border-orange-500 text-orange-600">SIGN UP</span>
      </div>


      {success ? (
        <div className="space-y-6 text-center">
          <p className="text-lg text-gray-700">
            Please check your email to verify your account before signing in.
          </p>
          <button
            className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold"
            onClick={() => router.push('/login')}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className={`w-full p-2 border rounded pr-10 ${errors.password ? 'border-red-500' : ''}`}
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

          <input
            type="text"
            placeholder="Full Name"
            className={`w-full p-2 border rounded ${errors.name ? 'border-red-500' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          <input
            type="text"
            placeholder="Role (e.g. driver, admin)"
            className={`w-full p-2 border rounded ${errors.role ? 'border-red-500' : ''}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-500 hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </>
  )
}
