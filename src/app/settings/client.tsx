'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'

interface Props {
  userEmail: string
  initialFullName: string
  initialStartingBalance?: number | null
}

export default function SettingsClient({ userEmail, initialFullName, initialStartingBalance }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [startingBalance, setStartingBalance] = useState(
    initialStartingBalance != null ? String(initialStartingBalance) : ''
  )
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          starting_balance: startingBalance ? parseFloat(startingBalance) : null
        })
        .eq('id', user.id)

      if (error) {
        toast.error('Failed to save profile: ' + error.message)
      } else {
        toast.success('Profile updated.')
      }
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error('Failed to update password: ' + error.message)
      } else {
        toast.success('Password updated.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-2xl mx-auto py-8">
          <h1 className="text-2xl font-bold text-[#0D0D1A] mb-8">Settings</h1>

          {/* Profile section */}
          <div className="bg-white rounded-2xl border border-[#E2DDD6] p-6 mb-6">
            <h2 className="text-base font-semibold text-[#0D0D1A] mb-5">Profile</h2>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#0D0D1A]">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF]/50 text-[#0D0D1A]/50 text-sm cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="fullName" className="text-sm font-medium text-[#0D0D1A]">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="startingBalance" className="text-sm font-medium text-[#0D0D1A]">
                  Starting Account Balance
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0D0D1A]/50 text-sm">$</span>
                  <input
                    id="startingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
                  />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5">The balance you started with. Used to calculate your true account value and % gain.</p>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#0D0D1A] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password section */}
          <div className="bg-white rounded-2xl border border-[#E2DDD6] p-6 mb-6">
            <h2 className="text-base font-semibold text-[#0D0D1A] mb-5">Change Password</h2>
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="newPassword" className="text-sm font-medium text-[#0D0D1A]">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[#0D0D1A]">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D0D1A] transition"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-[#0D0D1A] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-red-200 p-6">
            <h2 className="text-base font-semibold text-red-700 mb-2">Danger Zone</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Sign out of your account on this device.
            </p>
            <button
              onClick={handleSignOut}
              className="bg-white border border-red-200 text-red-600 text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
