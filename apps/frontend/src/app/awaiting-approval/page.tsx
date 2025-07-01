'use client'
import { useRouter } from 'next/navigation'

export default function AwaitingApprovalPage() {
  const router = useRouter()

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center space-y-6">
        <h2 className="text-2xl font-bold text-black">Account Awaiting Approval</h2>
        <p className="text-gray-600 text-sm">
          Your account is currently awaiting admin approval. You will receive an email once your access has been granted.
        </p>
        <button
          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
          onClick={() => router.push('/login')}
        >
          Return to Sign In
        </button>
      </div>
    </main>
  )
}
