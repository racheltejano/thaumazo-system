'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isLogin) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })


      if (loginError) {
        setError(loginError.message)
      } else {
        router.push('/dashboard') //Check if the user is approved
      }
    } else {
      const { error: signupError } = await supabase.auth.signUp({ email, password })


      if (signupError) {
        setError(signupError.message)
      } else {
        // After successful signup, redirect to waiting page
        router.push('/awaiting-approval')
      }
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>

        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="w-full p-2 bg-black text-white rounded">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <p className="text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </form>
    </main>
  )
}
