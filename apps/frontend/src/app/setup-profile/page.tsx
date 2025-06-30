"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SetupProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login")
      } else {
        setUserId(user.id)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
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
      router.push("/awaiting-approval")
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center mb-4">Set up your profile</h2>
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
    </main>
  )
} 