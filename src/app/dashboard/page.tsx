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

interface CalendarDay {
  date: string
  day: number
  pnl: number
  tradeCount: number
  isCurrentMonth: boolean
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

function formatCalendarMoney(value: number): string {
  const abs = Math.abs(value)
  return `${value >= 0 ? '+' : '-'}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('starting_balance, full_name')
    .eq('id', user.id)
    .single()

  const allTrades: Trade[] = trades ?? []
  const startingBalance: number | null = profile?.starting_balance ?? null

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

  // P&L Calendar — latest logged month on dashboard
  const latestTrade = [...allTrades].sort((a, b) => b.date.localeCompare(a.date))[0]
  const dashboardMonth = latestTrade ? toMonthKey(latestTrade.date) : new Date().toISOString().slice(0, 7)
  const [calYear, calMonth] = dashboardMonth.split('-').map(Number)
  const firstOfMonth = new Date(calYear, calMonth - 1, 1)
  const firstCalendarDay = new Date(firstOfMonth)
  firstCalendarDay.setDate(firstCalendarDay.getDate() - firstCalendarDay.getDay())

  const pnlByDate: Record<string, { pnl: number; tradeCount: number }> = {}
  for (const trade of allTrades) {
    if (!pnlByDate[trade.date]) pnlByDate[trade.date] = { pnl: 0, tradeCount: 0 }
    pnlByDate[trade.date].pnl += trade.pnl ?? 0
    pnlByDate[trade.date].tradeCount += 1
  }

  const calendarDays: CalendarDay[] = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(firstCalendarDay)
    day.setDate(firstCalendarDay.getDate() + i)
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const data = pnlByDate[date]
    return {
      date,
      day: day.getDate(),
      pnl: Number((data?.pnl ?? 0).toFixed(2)),
      tradeCount: data?.tradeCount ?? 0,
      isCurrentMonth: day.getMonth() === calMonth - 1,
    }
  })

  const dashboardMonthTrades = allTrades.filter((t) => toMonthKey(t.date) === dashboardMonth)
  const dashboardMonthPnl = dashboardMonthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const dashboardTradedDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0).length
  const dashboardGreenDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0 && d.pnl > 0).length
  const dashboardRedDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0 && d.pnl < 0).length
  const tradedCalendarDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0)
  const largestAbsDay = tradedCalendarDays.length > 0 ? Math.max(...tradedCalendarDays.map((d) => Math.abs(d.pnl))) : 0
  const bestCalendarDay = tradedCalendarDays.filter((d) => d.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0]
  const worstCalendarDay = tradedCalendarDays.filter((d) => d.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0]

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

          {/* ── Stats cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Account Value / Total P&L */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
              {startingBalance != null ? (
                <>
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">Account Value</p>
                  {isEmpty ? (
                    <p className="text-xl font-bold text-[#0D0D1A]/30">—</p>
                  ) : (
                    <>
                      <p className={`text-xl font-bold ${totalPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        ${(startingBalance + totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${totalPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {totalPnl >= 0 ? '+' : ''}{((totalPnl / startingBalance) * 100).toFixed(1)}% ({totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">Total P&amp;L</p>
                  {isEmpty ? (
                    <p className="text-xl font-bold text-[#0D0D1A]/30">—</p>
                  ) : (
                    <p className={`text-xl font-bold ${totalPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {totalPnl >= 0 ? '' : '-'}${Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  <p className="text-xs text-[#9CA3AF] mt-1">Set starting balance in Settings</p>
                </>
              )}
            </div>

            {/* Win Rate */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
              <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                Win Rate
              </p>
              {isEmpty ? (
                <p className="text-xl font-bold text-[#0D0D1A]/30">—</p>
              ) : (
                <p
                  className={`text-xl font-bold ${
                    winRate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {winRate.toFixed(1)}%
                </p>
              )}
            </div>

            {/* Total Trades */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
              <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                Total Trades
              </p>
              {isEmpty ? (
                <p className="text-xl font-bold text-[#0D0D1A]/30">—</p>
              ) : (
                <p className="text-xl font-bold text-[#0D0D1A]">{totalTrades}</p>
              )}
            </div>

            {/* Current Streak */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5">
              <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-2">
                Streak
              </p>
              {isEmpty ? (
                <p className="text-xl font-bold text-[#0D0D1A]/30">—</p>
              ) : (
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
              )}
            </div>
          </div>

          {isEmpty ? (
            /* ── Welcome empty state ── */
            <div className="bg-white rounded-2xl border border-[#E2DDD6] p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-bold text-[#0D0D1A] mb-2">Welcome to your TSA Trade Journal</h2>
              <p className="text-[#6B6B6B] text-sm mb-6 max-w-sm mx-auto">
                Log your first trade to start tracking your edge. Every trade you log builds your data.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/trades/new" className="bg-[#0D0D1A] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                  Log Your First Trade
                </Link>
                <Link href="/trades" className="bg-[#EDE8DF] text-[#0D0D1A] px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity">
                  Import CSV
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#0D0D1A]">C</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Catalyst</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0D0D1A]">K</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Key Level</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0D0D1A]">S + R</p>
                  <p className="text-xs text-[#6B6B6B] mt-1">Setup + Risk</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── P&L Calendar ── */}
              <div className="relative overflow-hidden rounded-[28px] border border-[#E2DDD6] bg-white p-4 md:p-6 mb-6 shadow-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(237,232,223,0.95),transparent_34%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#C9A84C] font-semibold mb-2">Performance Heatmap</p>
                      <h2 className="text-xl md:text-2xl font-bold text-[#0D0D1A]">P&amp;L Calendar</h2>
                      <p className="text-xs text-[#0D0D1A]/45 mt-1">{monthLabel(dashboardMonth)} daily net P&amp;L</p>
                    </div>
                    <Link href="/analytics" className="rounded-full bg-[#F8F5EF] border border-[#E2DDD6] px-3 py-2 text-xs md:text-sm text-[#0D0D1A]/55 hover:text-[#0D0D1A] hover:bg-[#EDE8DF] transition-colors font-medium whitespace-nowrap">
                      Details →
                    </Link>
                  </div>

                  <div className="rounded-3xl bg-[#F8F5EF] border border-[#E2DDD6] p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#0D0D1A]/45 mb-1">Month P&amp;L</p>
                        <p className={`text-4xl md:text-5xl font-black tracking-tight ${dashboardMonthPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {dashboardMonthPnl >= 0 ? '+' : ''}{formatCurrency(dashboardMonthPnl)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white border border-[#E2DDD6] px-3 py-1.5 text-xs font-semibold text-[#0D0D1A]/65">{dashboardTradedDays} traded days</span>
                        <span className="rounded-full bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 text-xs font-semibold text-[#15803D]">{dashboardGreenDays} green</span>
                        <span className="rounded-full bg-[#FEE2E2] border border-[#FECACA] px-3 py-1.5 text-xs font-semibold text-[#B91C1C]">{dashboardRedDays} red</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-[10px] md:text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/35 pb-1">{day}</div>
                  ))}
                  {calendarDays.map((day) => {
                    const hasTrade = day.tradeCount > 0
                    const isGreen = day.pnl > 0
                    const isRed = day.pnl < 0
                    const intensity = largestAbsDay > 0 ? Math.min(1, Math.abs(day.pnl) / largestAbsDay) : 0
                    const heatClass = !day.isCurrentMonth
                      ? 'bg-[#F8F5EF]/45 border-[#E2DDD6]/45 text-[#0D0D1A]/20'
                      : hasTrade && isGreen && intensity > 0.66
                        ? 'bg-[#16A34A] border-[#86EFAC] text-white shadow-sm'
                        : hasTrade && isGreen && intensity > 0.33
                          ? 'bg-[#86EFAC] border-[#4ADE80] text-[#14532D]'
                          : hasTrade && isGreen
                            ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
                            : hasTrade && isRed && intensity > 0.66
                              ? 'bg-[#DC2626] border-[#FCA5A5] text-white shadow-sm'
                              : hasTrade && isRed && intensity > 0.33
                                ? 'bg-[#FCA5A5] border-[#F87171] text-[#7F1D1D]'
                                : hasTrade && isRed
                                  ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
                                  : 'bg-[#F8F5EF] border-[#E2DDD6] text-[#0D0D1A]/35'
                    return (
                      <div
                        key={day.date}
                        className={`min-h-[58px] md:min-h-[88px] rounded-2xl border p-1.5 md:p-2 flex flex-col justify-between ${heatClass}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] md:text-sm font-bold opacity-75">{day.day}</span>
                          {hasTrade && <span className="rounded-full bg-white/55 px-1.5 py-0.5 text-[8px] md:text-[10px] font-bold opacity-75">{day.tradeCount}x</span>}
                        </div>
                        {hasTrade ? (
                          <p className="text-[10px] md:text-base font-black leading-tight tracking-tight">{formatCalendarMoney(day.pnl)}</p>
                        ) : (
                          <p className="text-[10px] opacity-20">—</p>
                        )}
                      </div>
                    )
                  })}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/40 font-semibold">Best Day</p>
                      <p className="text-lg font-black text-[#16A34A]">{bestCalendarDay ? formatCalendarMoney(bestCalendarDay.pnl) : '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/40 font-semibold">Worst Day</p>
                      <p className="text-lg font-black text-[#DC2626]">{worstCalendarDay ? formatCalendarMoney(worstCalendarDay.pnl) : '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/40 font-semibold">Legend</p>
                      <p className="text-xs text-[#0D0D1A]/50 mt-1">Light = small day · Dark = big day</p>
                    </div>
                  </div>
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
