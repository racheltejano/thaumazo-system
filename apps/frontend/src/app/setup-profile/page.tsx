"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import DashboardLayout from "@/components/DashboardLayout"

export default function SetupProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

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
        body: formData,
      })

      const data = await res.json()
      return data.secure_url || null
    } catch (err) {
      console.error("Cloudinary upload error:", err)
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
    let uploadedImageUrl: string | null = previewUrl

    if (profilePicFile) {
      uploadedImageUrl = await uploadToCloudinary(profilePicFile)
      if (!uploadedImageUrl) {
        setError("Failed to upload image to Cloudinary.")
        setLoading(false)
        return
      }
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        profile_pic: uploadedImageUrl,
      })
      .eq("id", userId)

    setLoading(false)
    if (dbError) {
      setError("❌ Failed to save profile.")
    } else {
      router.push("/awaiting-approval")
    }
  }

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-xl mx-auto mt-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-md space-y-6"
        >
          <h2 className="text-2xl font-bold text-gray-900">📝 Complete Your Profile</h2>

          {error && <p className="text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Picture (optional)</label>
            <input
              className="mt-1"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className="mt-4 w-24 h-24 rounded-full overflow-hidden border border-gray-300 shadow">
                <Image
                  src={previewUrl}
                  alt="Profile Preview"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  )
}
