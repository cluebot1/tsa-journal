'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Signup failed. Please try again.')
        setLoading(false)
        return
      }

      if (result.needsEmailConfirmation) {
        setSuccess(true)
        setLoading(false)
        return
      }

      router.push('/login?created=1')
      router.refresh()
    } catch {
      setError('Connection issue. Please refresh and try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="font-sans min-h-screen flex items-center justify-center bg-[#EDE8DF] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-[#0D0D1A] mb-2">Check your email</h2>
          <p className="text-[#6B6B6B] text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to log in.
          </p>
          <a href="/login" className="bg-[#0D0D1A] text-white px-6 py-3 rounded-xl font-semibold text-sm inline-block hover:opacity-90 transition-opacity">
            Go to Login
          </a>
        </div>
      </div>
    )
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="fullName" className="text-sm font-medium text-[#0D0D1A]">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-[#0D0D1A]">
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
            <label htmlFor="password" className="text-sm font-medium text-[#0D0D1A]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
            />
          </div>

          {error && (
            <p className="text-[#EF4444] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D0D1A] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B6B6B] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0D0D1A] font-semibold hover:opacity-70 transition-opacity">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-[#9CA3AF] mt-3">
          TSA members only.
        </p>
      </div>
    </div>
  )
}
