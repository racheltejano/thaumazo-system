"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage("Password updated! You can now log in.")
      setTimeout(() => router.push("/login"), 2000)
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <h2 className="text-2xl font-bold text-center text-gray-800">Reset Password</h2>

        <input
          className="w-full p-3 border border-gray-300 rounded text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="New Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 rounded text-white font-medium ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#f26522] hover:bg-[#d9541c]"
          }`}
        >
          {loading ? "Setting..." : "Set New Password"}
        </button>

        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </main>
  )
}
