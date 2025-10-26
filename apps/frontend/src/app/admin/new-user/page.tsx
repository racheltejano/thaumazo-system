/**
 * 🧑‍💼 Admin User Management Page
 * 
 * This client-side page lets admins directly create new users with assigned roles.
 * Users receive an email with temporary credentials that they must change on first login.
 * 
 * ⚙️ Main Function:
 * - `AdminApprovalsPage()`: Displays a form to create users with auto-generated passwords
 * 
 * 🧩 Features:
 * - Admin-only access check (redirects non-admins)
 * - Direct user creation with email/role
 * - Auto-generates secure temporary password
 * - Sends welcome email with credentials via Resend
 * - Smooth fade-in animation on load
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminApprovalsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
    }

    checkAdmin()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!email || !role) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role,
          adminUserId: currentUserId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setMessage({ 
        type: 'success', 
        text: data.warning || 'User created successfully! They will receive an email with their credentials.'
      })
      setEmail('')
      setRole('')
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred while creating the user'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className={`max-w-5xl mx-auto transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-black mb-2">👤 Create New User</h2>
          <p className="text-gray-600">Add a new user to the system with assigned role and auto-generated credentials</p>
        </div>

        {message && (
          <div 
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-medium">
              {message.type === 'success' ? '✅ Success' : '❌ Error'}
            </p>
            <p className="text-sm mt-1">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              📧 Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="user@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-black placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
              🔐 User Role
            </label>
            <select
              id="role"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-black bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">-- Select Role --</option>
              <option value="admin">Admin</option>
              <option value="driver">Driver</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="inventory_staff">Inventory Staff</option>
            </select>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>How it works:</strong> A secure temporary password will be automatically generated and sent to the user's email address. 
                  The user will be required to change this password upon their first login for security.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating User...
              </span>
            ) : (
              '✉️ Create User & Send Credentials'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">1.</span>
              <span>User account is created with email confirmation automatically approved</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">2.</span>
              <span>A secure 12-character temporary password is generated</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">3.</span>
              <span>Welcome email is sent with login credentials</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">4.</span>
              <span>User can log in immediately and will be prompted to change password</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}