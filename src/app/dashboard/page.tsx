export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import EquityChart from '@/components/EquityChart'
import DashboardHelp from '@/components/DashboardHelp'

interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  setup_type: string
  direction: 'Long' | 'Short'
  pnl: number | null
  notes?: string | null
  created_at?: string
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  return `${value < 0 ? '-' : ''}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  const allTrades: Trade[] = trades ?? []

  // --- Compute stats ---
  const totalPnl = allTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  const totalTrades = allTrades.length

  const winningTrades = allTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  // Current streak: iterate from most recent backwards
  let currentStreak = 0
  let streakType: 'W' | 'L' | null = null

  const sortedByDate = [...allTrades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  for (const trade of sortedByDate) {
    const isWin = (trade.pnl ?? 0) > 0
    const thisType: 'W' | 'L' = isWin ? 'W' : 'L'
    if (streakType === null) {
      streakType = thisType
      currentStreak = 1
    } else if (thisType === streakType) {
      currentStreak++
    } else {
      break
    }
  }

  const streakLabel =
    currentStreak > 0 && streakType ? `${currentStreak}${streakType}` : '—'
  const streakIsWin = streakType === 'W'

  // Recent 5 trades (most recent first)
  const recentTrades = [...allTrades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const isEmpty = allTrades.length === 0

  // Setup badge color helper
  const setupColors: Record<string, string> = {
    '30-Min ORB': 'bg-blue-50 text-blue-700',
    'Gap Strategy': 'bg-purple-50 text-purple-700',
    '4H Reversal': 'bg-amber-50 text-amber-700',
    'Key Level Reaction': 'bg-teal-50 text-teal-700',
    'Broadening Formation Breakout': 'bg-pink-50 text-pink-700',
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={user.email} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#0D0D1A]">Dashboard</h1>
                <DashboardHelp />
              </div>
              <p className="text-sm text-[#0D0D1A]/50 mt-0.5">
                Welcome back{user.email ? `, ${user.email.split('@')[0]}` : ''}.
              </p>
            </div>
            <Link
              href="/trades/new"
              className="bg-[#0D0D1A] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Trade
            </Link>
          </div>

          {isEmpty ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2DDD6] flex items-center justify-center mb-4 shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D0D1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#0D0D1A] mb-2">No trades yet</h2>
              <p className="text-sm text-[#0D0D1A]/50 mb-6 max-w-xs">
                Start logging your trades to see your stats, equity curve, and performance insights here.
              </p>
              <Link
                href="/trades/new"
                className="bg-[#0D0D1A] text-white text-sm font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Log Your First Trade
              </Link>
            </div>
          ) : (
            <>
              {/* ── Stats cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Total P&L */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                    Total P&amp;L
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      totalPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {totalPnl >= 0 ? '' : '-'}${Math.abs(totalPnl).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {/* Win Rate */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                    Win Rate
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      winRate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    }`}
                  >
                    {winRate.toFixed(1)}%
                  </p>
                </div>

                {/* Total Trades */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                    Total Trades
                  </p>
                  <p className="text-xl font-bold text-[#0D0D1A]">{totalTrades}</p>
                </div>

                {/* Current Streak */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                    Streak
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      currentStreak === 0
                        ? 'text-[#0D0D1A]'
                        : streakIsWin
                        ? 'text-[#22C55E]'
                        : 'text-[#EF4444]'
                    }`}
                  >
                    {streakLabel}
                  </p>
                </div>
              </div>

              {/* ── Equity Chart ── */}
              <div className="mb-6">
                <EquityChart trades={allTrades.map((t) => ({ date: t.date, pnl: t.pnl }))} />
              </div>

              {/* ── Recent Trades ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DDD6]">
                  <h2 className="text-base font-semibold text-[#0D0D1A]">Recent Trades</h2>
                  <Link
                    href="/trades"
                    className="text-sm text-[#0D0D1A]/50 hover:text-[#0D0D1A] transition-colors font-medium"
                  >
                    View All →
                  </Link>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2DDD6]">
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide">
                          Date
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide">
                          Ticker
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide">
                          Setup
                        </th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide">
                          P&amp;L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map((trade) => {
                        const pnl = trade.pnl ?? 0
                        const isWin = pnl > 0
                        return (
                          <tr
                            key={trade.id}
                            className="border-b border-[#E2DDD6] last:border-0 hover:bg-[#EDE8DF]/40 transition-colors"
                          >
                            <td className="px-6 py-4 text-[#0D0D1A]/60">{formatDate(trade.date)}</td>
                            <td className="px-6 py-4 font-semibold text-[#0D0D1A]">{trade.ticker}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  setupColors[trade.setup_type] ?? 'bg-gray-50 text-gray-700'
                                }`}
                              >
                                {trade.setup_type}
                              </span>
                            </td>
                            <td
                              className={`px-6 py-4 text-right font-semibold ${
                                isWin ? 'text-[#22C55E]' : pnl < 0 ? 'text-[#EF4444]' : 'text-[#0D0D1A]'
                              }`}
                            >
                              {pnl >= 0 ? '+' : ''}
                              {formatCurrency(pnl)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-[#E2DDD6]">
                  {recentTrades.map((trade) => {
                    const pnl = trade.pnl ?? 0
                    const isWin = pnl > 0
                    return (
                      <div key={trade.id} className="px-4 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#0D0D1A]">{trade.ticker}</p>
                          <p className="text-xs text-[#0D0D1A]/50 mt-0.5">{formatDate(trade.date)}</p>
                          <span
                            className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                              setupColors[trade.setup_type] ?? 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {trade.setup_type}
                          </span>
                        </div>
                        <p
                          className={`text-base font-bold ${
                            isWin ? 'text-[#22C55E]' : pnl < 0 ? 'text-[#EF4444]' : 'text-[#0D0D1A]'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}
                          {formatCurrency(pnl)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
