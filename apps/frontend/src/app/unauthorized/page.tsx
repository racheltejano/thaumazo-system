'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">🚫 Unauthorized</h1>
      <p className="text-lg text-gray-700 mb-2">You do not have permission to access this page.</p>
      <button 
        onClick={() => router.push('/login')} 
        className="mt-4 text-blue-600 underline cursor-pointer"
      >
        Return to Login
      </button>
    </div>
  );
} 