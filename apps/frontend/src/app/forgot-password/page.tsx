"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
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
    <main className="flex flex-col items-center justify-center h-screen p-4">
      {message ? (
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-lg text-gray-700">{message}</p>
          <button
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded"
            onClick={() => router.push('/login')}
          >
            Return to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold text-center mb-4">Reset your password</h2>
          <label htmlFor="email" className="block text-gray-700 text-sm mb-1">
            Enter your account's verified email address and we will send you a password reset link.
          </label>
          <input
            id="email"
            className="w-full p-2 border rounded"
            placeholder="Enter your email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            disabled={!isValidEmail(email)}
          >
            Send password reset email
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      )}
    </main>
  )
} 