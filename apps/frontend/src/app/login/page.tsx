'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation for empty fields
    if (!email || !password) {
      setError('Invalid email or password.')
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      // Always show a generic error message
      setError('Invalid email or password.')
    } else {
      router.push('/dashboard') //Check if the user is approved
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">Sign in to Thaumazo</h2>

        <label htmlFor="email" className="block font-medium mb-1">Email address</label>
        <input
          id="email"
          className="w-full p-2 border rounded"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block font-medium mb-1">Password</label>
          <a href="/forgot-password" className="text-blue-600 text-sm underline ml-2">Forgot password?</a>
        </div>
        <input
          id="password"
          className="w-full p-2 border rounded"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold">
          Sign in
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <p className="text-center text-sm text-gray-500">
          New to Thaumazo?{' '}
          <a href="/register" className="text-blue-600 underline">Create an account</a>
        </p>
      </form>
    </main>
  )
}
