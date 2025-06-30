"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) setError(error.message)
    else setMessage("Check your email for a password reset link.")
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">Forgot Password</h2>
        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button className="w-full p-2 bg-black text-white rounded">Send Reset Link</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </main>
  )
} 