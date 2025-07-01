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
      <div className="flex space-x-6 mb-4 justify-center">
        <Link href="/login" className="text-gray-500 hover:text-orange-500">SIGN IN</Link>
        <Link href="/register" className="text-gray-500 hover:text-orange-500">SIGN UP</Link>
      </div>



      {message ? (
        <div className="space-y-6 text-center">
          <p className="text-lg text-gray-700">{message}</p>
          <button
            className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
            onClick={() => router.push('/login')}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-center text-gray-800">Reset your password</h2>
          <p className="text-sm text-gray-600 text-center">
            Enter your account&#39;s verified email address and we&#8217;ll send you a password reset link.
          </p>

          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full p-3 border border-gray-300 rounded text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f26522]"
          />

          <button
            type="submit"
            disabled={!isValidEmail(email)}
            className={`w-full p-3 rounded text-white font-medium ${
              isValidEmail(email)
                ? "bg-[#f26522] hover:bg-[#d9541c]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Send password reset email
          </button>


          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      )}
    </>
  )
}
