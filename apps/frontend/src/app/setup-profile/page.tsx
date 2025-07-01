"use client"
import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SetupProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Replace these with your actual Cloudinary values
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!


  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login")
      } else {
        setUserId(user.id)
      }
    })
  }, [router])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePicFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", UPLOAD_PRESET)

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (data.secure_url) {
        return data.secure_url
      } else {
        console.error("Cloudinary upload failed:", data)
        return null
      }
    } catch (err) {
      console.error("Cloudinary error:", err)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!firstName || !lastName) {
      setError("Please fill in all fields.")
      return
    }

    if (!userId) {
      setError("User not authenticated.")
      return
    }

    setLoading(true)
    let uploadedImageUrl: string | null = null

    if (profilePicFile) {
      uploadedImageUrl = await uploadToCloudinary(profilePicFile)
      if (!uploadedImageUrl) {
        setError("Failed to upload image to Cloudinary.")
        setLoading(false)
        return
      }
    }
    // console.log({
    //   id: userId,
    //   first_name: firstName,
    //   last_name: lastName,
    //   profile_pic: uploadedImageUrl
    // })

    const { error: dbError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      profile_pic: uploadedImageUrl
    })
    .eq("id", userId)


    setLoading(false)
    if (dbError) {
      setError("Failed to save profile.")
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

        <label htmlFor="profilePic" className="block font-medium mb-1">Profile picture (optional)</label>
        <input
          id="profilePic"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover mt-2" />
        )}

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
