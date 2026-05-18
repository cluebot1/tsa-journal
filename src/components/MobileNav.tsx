'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, LineChart, BookOpen, BrainCircuit } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', Icon: BarChart2 },
  { label: 'Analytics', href: '/analytics', Icon: LineChart },
  { label: 'AI Review', href: '/ai-review', Icon: BrainCircuit },
  { label: 'Journal', href: '/journal', Icon: BookOpen },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E2DDD6] md:hidden z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ label, href, Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/' || pathname.startsWith('/dashboard')
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors ${
                isActive ? 'text-[#0D0D1A] font-semibold' : 'text-[#0D0D1A]/40'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
