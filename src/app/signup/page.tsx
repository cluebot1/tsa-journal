'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    // Step 1: Validate invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .is('used_by', null)
      .single()

    if (inviteError || !inviteData) {
      setError('Invalid or already used invite code.')
      setLoading(false)
      return
    }

    // Step 2: Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const user = signUpData.user
    if (!user) {
      setError('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // Step 3: Insert into profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Step 4: Mark invite code as used
    await supabase
      .from('invite_codes')
      .update({
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', inviteCode)

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
              htmlFor="fullName"
              className="text-sm font-medium text-[#0D0D1A]"
            >
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

          <div className="flex flex-col gap-1">
            <label
              htmlFor="inviteCode"
              className="text-sm font-medium text-[#0D0D1A]"
            >
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="TSA-XXXX-XXXX"
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer links */}
        <p className="text-center text-sm text-[#6B6B6B] mt-6">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-[#0D0D1A] font-semibold hover:opacity-70 transition-opacity"
          >
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-[#9CA3AF] mt-3">
          This portal is for TSA members only.
        </p>
      </div>
    </div>
  )
}
