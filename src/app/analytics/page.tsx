'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import { Skeleton } from '@/components/ui/skeleton'

const SETUPS = [
  '30-Min ORB',
  'Gap Strategy',
  '4H Reversal',
  'Key Level Reaction',
  'Broadening Formation Breakout',
] as const

const SETUP_SHORT: Record<string, string> = {
  '30-Min ORB': 'ORB',
  'Gap Strategy': 'Gap',
  '4H Reversal': '4HR',
  'Key Level Reaction': 'KLR',
  'Broadening Formation Breakout': 'BFB',
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  setup: string
  direction: 'Long' | 'Short'
  pnl: number | null
}

interface SetupStat {
  setup: string
  shortName: string
  winRate: number
  totalPnl: number
  tradeCount: number
}

interface DayOfWeekStat {
  day: string
  pnl: number
}

interface MonthStat {
  month: string
  pnl: number
}

function formatDollar(v: number): string {
  const abs = Math.abs(v)
  const formatted =
    abs >= 1000
      ? `$${(abs / 1000).toFixed(1)}k`
      : `$${abs.toFixed(0)}`
  return v < 0 ? `-${formatted}` : formatted
}

interface CustomBarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

function CustomBarTooltip({ active, payload, label }: CustomBarTooltipProps) {
  if (active && payload && payload.length) {
    const value = payload[0].value
    const isPositive = value >= 0
    return (
      <div className="bg-[#0D0D1A] text-white rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-white/60 mb-1">{label}</p>
        <p className={`font-semibold ${isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
          {isPositive ? '+' : ''}${Math.abs(value).toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

interface WinRateTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function WinRateTooltip({ active, payload, label }: WinRateTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D0D1A] text-white rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-white/60 mb-1">{label}</p>
        <p className="font-semibold text-[#22C55E]">{payload[0].value.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email)

      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      setTrades(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // ─── Computed analytics ───────────────────────────────────────────────────

  // 1. Win rate & P&L by setup
  const setupStats: SetupStat[] = SETUPS.map((setup) => {
    const setupTrades = trades.filter((t) => t.setup === setup)
    const wins = setupTrades.filter((t) => (t.pnl ?? 0) > 0).length
    const winRate = setupTrades.length > 0 ? (wins / setupTrades.length) * 100 : 0
    const totalPnl = setupTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    return {
      setup,
      shortName: SETUP_SHORT[setup] ?? setup,
      winRate: parseFloat(winRate.toFixed(1)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      tradeCount: setupTrades.length,
    }
  })

  // 2. P&L by day of week
  const pnlByDayOfWeek: DayOfWeekStat[] = DAYS_OF_WEEK.map((day) => {
    const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(day)
    // getDay(): 0=Sun, 1=Mon, ..., 5=Fri
    const targetDay = dayIndex + 1
    const dayTrades = trades.filter((t) => {
      const [year, month, d] = t.date.split('-').map(Number)
      const date = new Date(year, month - 1, d)
      return date.getDay() === targetDay
    })
    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    return { day, pnl: parseFloat(pnl.toFixed(2)) }
  })

  // 3. P&L by month
  const monthMap: Record<string, number> = {}
  for (const trade of trades) {
    const month = trade.date.slice(0, 7) // YYYY-MM
    monthMap[month] = (monthMap[month] ?? 0) + (trade.pnl ?? 0)
  }
  const pnlByMonth: MonthStat[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({
      month,
      pnl: parseFloat(pnl.toFixed(2)),
    }))

  // Format month label: "2025-03" → "Mar '25"
  function formatMonth(m: string): string {
    const [year, month] = m.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // 4. Avg winner / loser
  const winners = trades.filter((t) => (t.pnl ?? 0) > 0)
  const losers = trades.filter((t) => (t.pnl ?? 0) < 0)

  const avgWinner =
    winners.length > 0
      ? winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winners.length
      : 0
  const avgLoser =
    losers.length > 0
      ? losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losers.length
      : 0

  // Best setup (highest total P&L with at least 1 trade)
  const bestSetup = setupStats
    .filter((s) => s.tradeCount > 0)
    .sort((a, b) => b.totalPnl - a.totalPnl)[0]

  // Best day of week
  const bestDay = [...pnlByDayOfWeek].sort((a, b) => b.pnl - a.pnl)[0]

  const isEmpty = trades.length === 0

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0D0D1A]">Analytics</h1>
            <p className="text-sm text-[#0D0D1A]/50 mt-0.5">
              Performance insights across your trade history.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6"
                >
                  <Skeleton className="h-5 w-36 rounded-lg mb-4" />
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && isEmpty && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2DDD6] flex items-center justify-center mb-4 shadow-sm">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0D0D1A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#0D0D1A] mb-2">No data yet</h2>
              <p className="text-sm text-[#0D0D1A]/50 mb-6 max-w-xs">
                Log your trades and your analytics will appear here automatically.
              </p>
            </div>
          )}

          {/* Charts */}
          {!loading && !isEmpty && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Chart 1: Win Rate by Setup */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Win Rate by Setup</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={setupStats}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                        domain={[0, 100]}
                        width={36}
                      />
                      <Tooltip content={<WinRateTooltip />} />
                      <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                        {setupStats.map((entry, index) => (
                          <Cell key={index} fill="#22C55E" fillOpacity={entry.tradeCount > 0 ? 1 : 0.2} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 2: P&L by Setup */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">P&amp;L by Setup</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={setupStats}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatDollar}
                        width={48}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="totalPnl" radius={[6, 6, 0, 0]}>
                        {setupStats.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.totalPnl >= 0 ? '#22C55E' : '#EF4444'}
                            fillOpacity={entry.tradeCount > 0 ? 1 : 0.2}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 3: P&L by Day of Week */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">P&amp;L by Day of Week</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={pnlByDayOfWeek}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatDollar}
                        width={48}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                        {pnlByDayOfWeek.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 4: Monthly P&L */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Monthly P&amp;L</h2>
                  {pnlByMonth.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <p className="text-sm text-[#0D0D1A]/40">Not enough data yet.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={pnlByMonth.map((m) => ({ ...m, label: formatMonth(m.month) }))}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={formatDollar}
                          width={48}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                          {pnlByMonth.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Summary stats row */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Avg Winner */}
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">
                      Avg Winner
                    </p>
                    <p className="text-xl font-bold text-[#22C55E]">
                      {winners.length > 0
                        ? `+$${avgWinner.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : '—'}
                    </p>
                  </div>

                  {/* Avg Loser */}
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">
                      Avg Loser
                    </p>
                    <p className="text-xl font-bold text-[#EF4444]">
                      {losers.length > 0
                        ? `-$${Math.abs(avgLoser).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : '—'}
                    </p>
                  </div>

                  {/* Best Setup */}
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">
                      Best Setup
                    </p>
                    <p className="text-lg font-bold text-[#0D0D1A]">
                      {bestSetup ? SETUP_SHORT[bestSetup.setup] ?? bestSetup.setup : '—'}
                    </p>
                    {bestSetup && bestSetup.tradeCount > 0 && (
                      <p className="text-xs text-[#0D0D1A]/40 mt-0.5">
                        {bestSetup.totalPnl >= 0 ? '+' : ''}$
                        {Math.abs(bestSetup.totalPnl).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Best Day */}
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">
                      Best Day
                    </p>
                    <p className="text-lg font-bold text-[#0D0D1A]">
                      {bestDay ? bestDay.day : '—'}
                    </p>
                    {bestDay && (
                      <p className="text-xs text-[#0D0D1A]/40 mt-0.5">
                        {bestDay.pnl >= 0 ? '+' : ''}${Math.abs(bestDay.pnl).toFixed(2)}
                      </p>
                    )}
                  </div>
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
