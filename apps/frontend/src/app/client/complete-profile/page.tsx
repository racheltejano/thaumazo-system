'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientCompleteProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/client/login')
        return
      }
      setUser(user)
      // Check if user already has a client profile
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      if (profile) {
        router.push('/client/dashboard')
      }
    }
    checkAuthAndProfile()
  }, [router])

  function validate() {
    const errs: { [key: string]: string } = {}
    if (!firstName) errs.firstName = 'First name cannot be blank'
    if (!lastName) errs.lastName = 'Last name cannot be blank'
    if (!phone) errs.phone = 'Phone number cannot be blank'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      // Create client profile record
      const { error: profileError } = await supabase
        .from('client_profiles')
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          contact_number: phone,
          email: user.email
        })
      if (profileError) {
        setErrors({ phone: 'Failed to complete profile. Please try again.' })
        setLoading(false)
        return
      }
      router.push('/client/dashboard')
    } catch (error) {
      setErrors({ phone: 'Profile completion failed. Please try again.' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-16 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-orange-600 text-center">Complete Your Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              className={`w-full p-2 border rounded text-gray-800 placeholder-gray-500 ${errors.firstName ? 'border-red-500' : ''}`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              className={`w-full p-2 border rounded text-gray-800 placeholder-gray-500 ${errors.lastName ? 'border-red-500' : ''}`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="text"
              className={`w-full p-2 border rounded text-gray-800 placeholder-gray-500 ${errors.phone ? 'border-red-500' : ''}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  )
} 