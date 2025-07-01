'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in both fields.')
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('Invalid email or password.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-6">
      {/* LEFT SIDE: Logo + Login Form */}
      <div className="w-full md:w-1/2 max-w-md space-y-6">
        {/* Logo + Company Name */}
        <div className="flex flex-col items-center">
          <Image
            src="/texts-logo.png"
            alt="TEXTS Logo"
            width={300}
            height={100}
            className="mb-2"
          />
          <p className="text-sm text-gray-600 -mt-2 text-center">
            <span className="font-bold text-orange-500">T</span>haumazo{' '}
            <span className="font-bold text-orange-500">EX</span>press Transport Solutions
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border rounded-lg shadow p-6">
          <div className="flex space-x-6 mb-4 justify-center">
            <button className="font-bold border-b-2 border-orange-500 text-orange-600">
              SIGN IN
            </button>
            <Link href="/register" className="text-gray-500 hover:text-orange-500">
              SIGN UP
            </Link>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Remember Me + Forgot Password */}
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox" />
                <span className="text-gray-500">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="text-orange-500 hover:underline">
                Forgot Password?
              </Link>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded"
            >
              Sign In
            </button>

            {/* Tracking Code Option */}
            <button
              type="button"
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded"
            >
              I have a tracking code
            </button>

            {/* Link to Register */}
            <p className="text-sm text-center text-gray-500">
              Don’t have an account?{' '}
              <Link href="/register" className="text-orange-500 hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE: Avatars Image */}
      <div className="hidden md:flex md:w-1/2 justify-center items-center">
        <Image
          src="/texts-avatars.png"
          alt="TEXTS Team Avatars"
          width={800}
          height={600}
          className="object-contain"
        />
      </div>
    </main>
  )
}
