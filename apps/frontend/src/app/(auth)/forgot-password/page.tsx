'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) setError(error.message)
    else setMessage("Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.")
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex justify-center space-x-8 text-sm font-medium mb-4">
        <Link
          href="/login"
          className="text-orange-500 hover:text-orange-600 transition-colors"
        >
          SIGN IN
        </Link>
        <Link
          href="/register"
          className="text-gray-400 hover:text-orange-500 transition-colors"
        >
          SIGN UP
        </Link>
      </div>

      {message ? (
        <div className="space-y-6 text-center">
          <p className="text-lg text-gray-700">{message}</p>
          <button
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
            onClick={() => router.push('/login')}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Reset your password</h2>
          <p className="text-sm text-gray-600 text-center">
            Enter your account&#39;s verified email address and we&#8217;ll send you a password reset link.
          </p>
          <input
            id="email"
            className="w-full p-2 border rounded"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50"
            disabled={!isValidEmail(email)}
          >
            Send password reset email
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      )}
    </>
  )
}
