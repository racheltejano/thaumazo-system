"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login")
        return
      }
      setUserId(user.id)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single()
      if (profile) {
        setFirstName(profile.first_name || "")
        setLastName(profile.last_name || "")
      }
      setLoading(false)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)
    const { error } = await supabase.from("profiles").update({
      first_name: firstName,
      last_name: lastName
    }).eq("id", userId)
    setSaving(false)
    if (error) {
      setError("Failed to update profile. Please try again.")
    } else {
      setSuccess("Profile updated successfully.")
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">User Settings</h2>
        <label htmlFor="firstName" className="block font-medium mb-1">First name</label>
        <input
          id="firstName"
          className="w-full p-2 border rounded"
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <label htmlFor="lastName" className="block font-medium mb-1">Last name</label>
        <input
          id="lastName"
          className="w-full p-2 border rounded"
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </main>
  )
} 