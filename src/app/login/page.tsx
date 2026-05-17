'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="font-sans min-h-screen flex items-center justify-center bg-[#EDE8DF] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0D0D1A] mb-2">
            The School of Threaded Arts
          </p>
          <h1 className="text-2xl font-bold text-[#0D0D1A]">
            TSA Trade Journal
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#0D0D1A]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#0D0D1A]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[#EF4444] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D0D1A] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-[#6B6B6B] mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-[#0D0D1A] font-semibold hover:opacity-70 transition-opacity"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
