'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Invalid email or password.')
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError('Invalid email or password.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
   <form onSubmit={handleSubmit} className="space-y-4">
  <div className="flex space-x-6 mb-4 justify-center">
    <span className="font-bold border-b-2 border-orange-500 text-orange-600">SIGN IN</span>
    <Link href="/register" className="text-gray-500 hover:text-orange-500">SIGN UP</Link>
  </div>

  <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
  <input type="password" placeholder="Password" className="w-full p-2 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} />

  <div className="flex justify-between items-center text-sm">
    <label className="flex items-center space-x-2">
      <input type="checkbox" className="form-checkbox" />
      <span>Remember Me</span>
    </label>
    <Link href="/forgot-password" className="text-orange-500 hover:underline">Forgot Password?</Link>
  </div>

  {/* 💥 Error Display */}
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
