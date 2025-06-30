"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login")
      } else {
        setUserId(user.id)
        // Fetch profile info
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single()
        if (data) {
          setFirstName(data.first_name || "")
          setLastName(data.last_name || "")
        }
        setProfileLoaded(true)
      }
    })
  }, [router])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!firstName || !lastName) {
      setError("Please fill in all fields.")
      return
    }
    setLoading(true)
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName
    })
    setLoading(false)
    if (error) {
      setError("Failed to save profile. Please try again.")
    } else {
      setError("")
    }
  }

  if (!profileLoaded) {
    return <main className="flex items-center justify-center h-screen">Loading...</main>
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8">
        <h2 className="text-3xl font-bold text-center mb-6">Settings</h2>
        {/* Profile Section */}
        <section className="rounded shadow p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Profile</h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
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
            <button
              className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
        {/* Future settings sections can be added here */}
      </div>
    </main>
  )
} 