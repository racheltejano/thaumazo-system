"use client"
import { useRouter } from "next/navigation"

export default function AwaitingApprovalPage() {
  const router = useRouter()
  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Account Awaiting Approval</h2>
        <p className="text-lg text-gray-700">Your account is awaiting admin approval. You will be notified by email once your account is approved.</p>
        <button
          className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded"
          onClick={() => router.push('/login')}
        >
          Return to sign in
        </button>
      </div>
    </main>
  )
} 