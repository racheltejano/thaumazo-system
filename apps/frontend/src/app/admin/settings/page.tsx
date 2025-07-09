"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import DashboardLayout from "@/components/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner" // ✅ Sonner toast

export default function SetupProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>("admin")
  const [email, setEmail] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setUserId(user.id)
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role) {
        setUserRole(profile.role)
      }
    }

    fetchUserData()
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

  const handleProfileUpdate = async () => {
    if (!firstName || !lastName) {
      toast.error("Please fill in all fields.")
      return
    }
    if (!userId) {
      toast.error("User not authenticated.")
      return
    }

    setLoading(true)
    let uploadedImageUrl: string | null = previewUrl

    if (profilePicFile) {
      uploadedImageUrl = await uploadToCloudinary(profilePicFile)
      if (!uploadedImageUrl) {
        toast.error("❌ Failed to upload image to Cloudinary.")
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
      toast.error("❌ Failed to save profile.")
    } else {
      toast.success("✅ Profile updated!")
      router.push(`/${userRole}`)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === email) return

    const { error: emailError } = await supabase.auth.updateUser({ email: newEmail })

    if (emailError) {
      toast.error(`⚠️ Failed to update email: ${emailError.message}`)
    } else {
      setEmail(newEmail)
      setNewEmail("")
      toast.success("📧 Email updated. A verification link has been sent to your new address.")
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("❌ Please fill out all password fields.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("❌ New passwords do not match.")
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })

    if (signInError) {
      toast.error(`❌ Incorrect current password: ${signInError.message}`)
      return
    }

    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })

    if (pwError) {
      toast.error(`❌ Failed to update password: ${pwError.message}`)
    } else {
      toast.success("🔐 Password updated! You’ll be signed out shortly.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setTimeout(() => {
        supabase.auth.signOut().then(() => router.push("/login"))
      }, 3000)
    }
  }

  return (
    <DashboardLayout role="admin" userName="Admin">
      <div className="max-w-xl mx-auto mt-10 space-y-4">
        <h1 className="text-3xl font-bold text-zinc-800">⚙️ Account Settings</h1>

        <div className="bg-white shadow-md rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-700">Manage Your Account</h2>
          <p className="text-sm text-zinc-500">Edit your profile, email, or password below.</p>

          <div className="grid gap-3 pt-2">
            {/* Edit Profile */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-zinc-800">
                  📝 Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Edit Profile</DialogTitle>
                <div className="space-y-4">
                  <input className="w-full p-3 border rounded-xl" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  <input className="w-full p-3 border rounded-xl" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {previewUrl && <Image src={previewUrl} alt="preview" width={96} height={96} className="rounded-full" />}
                  <Button onClick={handleProfileUpdate} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    {loading ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Change Email */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-zinc-800">
                  📧 Change Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Change Email</DialogTitle>
                <div className="space-y-4">
                  <input className="w-full p-3 border rounded-xl bg-gray-100 text-gray-700" disabled value={email} />
                  <input className="w-full p-3 border rounded-xl" placeholder="New email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  <Button onClick={handleEmailChange} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Update Email</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Change Password */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-zinc-800">
                  🔐 Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Change Password</DialogTitle>
                <div className="space-y-4">
                  <input className="w-full p-3 border rounded-xl" type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  <input className="w-full p-3 border rounded-xl" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <input className="w-full p-3 border rounded-xl" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <Button onClick={handlePasswordChange} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Update Password</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
