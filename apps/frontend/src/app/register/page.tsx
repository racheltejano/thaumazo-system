"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{[key:string]: string}>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const errs: {[key:string]: string} = {}
    if (!email) errs.email = "Email cannot be blank"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email is invalid"
    if (!password) errs.password = "Password cannot be blank"
    else if (password.length < 6) errs.password = "Password must be at least 6 characters"
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
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setErrors({ email: "Registration failed. Please try again." })
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      {success ? (
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-lg text-gray-700">Please check your email to verify your account before signing in.</p>
          <button
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded"
            onClick={() => router.push('/login')}
          >
            Return to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold text-center mb-4">Create your Thaumazo account</h2>

          <label htmlFor="email" className="block font-medium mb-1">Email address</label>
          <input
            id="email"
            className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {errors.email && <p className="text-red-500 text-sm mb-1">{errors.email}</p>}

          <label htmlFor="password" className="block font-medium mb-1">Password</label>
          <div className="relative">
            <input
              id="password"
              className={`w-full p-2 border rounded pr-10 ${errors.password ? 'border-red-500' : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? 'hide' : 'show'}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm mb-1">{errors.password}</p>}

          <button
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign up'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already registered?{' '}
            <a href="/login" className="text-blue-600 underline">Sign in</a>
          </p>
        </form>
      )}
    </main>
  )
} 