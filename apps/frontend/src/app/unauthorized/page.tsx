export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">🚫 Unauthorized</h1>
      <p className="text-lg text-gray-700 mb-2">You do not have permission to access this page.</p>
      <a href="/login" className="mt-4 text-blue-600 underline">Return to Login</a>
    </div>
  );
} 