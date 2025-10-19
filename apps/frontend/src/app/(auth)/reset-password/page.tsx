/**
 * 🔐 Reset Password Page
 * 
 * This client-side page allows users to set a new password after clicking a reset link.
 * It uses Supabase authentication to update the user’s password and signs them out 
 * once the change is complete.
 * 
 * ⚙️ Main Function:
 * - `ResetPasswordPage()`: Handles password validation, update, and success state.
 * 
 * 🧩 Helper Component:
 * - `PasswordInput`: A reusable input field with a “show/hide password” toggle using icons.
 * 
 * 🧠 Features:
 * - Validates matching passwords
 * - Checks password length
 * - Updates password via Supabase
 * - Signs user out after reset
 * - Shows email of the account being reset
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff } from "lucide-react"

// Password Input Component with visibility toggle
function PasswordInput({ 
  value, 
  onChange, 
  placeholder, 
  className = "" 
}: { 
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        className={`w-full p-3 pr-12 border border-gray-300 rounded text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}
        placeholder={placeholder}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  // Get user email on component mount
  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUserEmail()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setLoading(false)
      setError(error.message)
    } else {
      // Sign out the user immediately after password update
      await supabase.auth.signOut()
      
      setLoading(false)
      setMessage("Password updated successfully!")
      setPasswordChanged(true)
    }
  }

  return (
    <>
      {/* Tab Navigation */}


      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <h2 className="text-2xl font-bold text-center text-gray-800">Reset Password</h2>
        
        {/* Display user email */}
        {userEmail && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Resetting password for:</p>
            <p className="text-sm font-medium text-gray-800">{userEmail}</p>
          </div>
        )}

        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="New Password"
        />

        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm New Password"
        />

        <button
          type="submit"
          disabled={loading || passwordChanged}
          className={`w-full p-3 rounded text-white font-medium ${
            loading || passwordChanged
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#f26522] hover:bg-[#d9541c]"
          }`}
        >
          {loading ? "Setting..." : passwordChanged ? "Password Updated" : "Set New Password"}
        </button>

        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        {passwordChanged && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Your password has been successfully updated.</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-orange-500 hover:text-orange-600 underline"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </form>
    </>
  )
}