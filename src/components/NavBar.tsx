'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavBarProps {
  userEmail?: string
}

const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Trades', href: '/trades' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'AI Review', href: '/ai-review' },
  { label: 'Journal', href: '/journal' },
]

export default function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-[#E2DDD6] z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-[#0D0D1A] font-bold text-base tracking-tight hover:opacity-80 transition-opacity"
        >
          TSA Journal
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-6">
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#0D0D1A] font-medium hover:opacity-60 transition-opacity"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User email + settings */}
          {userEmail && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-[#6B6B6B] max-w-[160px] truncate">
                {userEmail}
              </span>
              <Link
                href="/settings"
                className="text-xs text-[#6B6B6B] hover:text-[#0D0D1A] transition-colors"
              >
                Settings
              </Link>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-[#0D0D1A] border border-[#E2DDD6] px-3 py-1.5 rounded-lg hover:bg-[#EDE8DF] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
