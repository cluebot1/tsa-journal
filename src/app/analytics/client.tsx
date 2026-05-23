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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import { Skeleton } from '@/components/ui/skeleton'
import HelpModal from '@/components/HelpModal'

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

const EMOTIONS = ['Calm', 'Confident', 'Focused', 'Anxious', 'Fearful', 'FOMO', 'Frustrated', 'Revenge', 'Overconfident', 'Greedy', 'Patient', 'Neutral']

const EMOTION_CATEGORY: Record<string, 'positive' | 'neutral' | 'negative'> = {
  Calm: 'positive', Confident: 'positive', Focused: 'positive', Patient: 'positive',
  Neutral: 'neutral', FOMO: 'neutral',
  Anxious: 'negative', Fearful: 'negative', Frustrated: 'negative', Revenge: 'negative', Overconfident: 'negative', Greedy: 'negative',
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  setup_type: string
  direction: string
  pnl: number | null
  emotion?: string | null
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

interface CalendarDay {
  date: string
  day: number
  pnl: number
  tradeCount: number
  isCurrentMonth: boolean
}

interface EmotionStat {
  emotion: string
  winRate: number
  tradeCount: number
  category: 'positive' | 'neutral' | 'negative'
}

interface TimelineDot {
  x: number
  y: number
  date: string
  dateLabel: string
  emotion: string
  ticker: string
  color: string
}

function formatDollar(v: number): string {
  const abs = Math.abs(v)
  const formatted =
    abs >= 1000
      ? `$${(abs / 1000).toFixed(1)}k`
      : `$${abs.toFixed(0)}`
  return v < 0 ? `-${formatted}` : formatted
}

function formatMoney(v: number): string {
  const abs = Math.abs(v)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `${v >= 0 ? '+' : '-'}$${formatted}`
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
  payload?: Array<{ value: number; payload: EmotionStat }>
  label?: string
}

function WinRateTooltip({ active, payload, label }: WinRateTooltipProps) {
  if (active && payload && payload.length) {
    const stat = payload[0].payload
    return (
      <div className="bg-[#0D0D1A] text-white rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-white/60 mb-1">{label}</p>
        <p className="font-semibold text-[#22C55E]">{payload[0].value.toFixed(1)}%</p>
        <p className="text-white/40 text-xs mt-0.5">{stat.tradeCount} trade{stat.tradeCount !== 1 ? 's' : ''}</p>
      </div>
    )
  }
  return null
}

interface ScatterTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TimelineDot }>
}

function ScatterTooltip({ active, payload }: ScatterTooltipProps) {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="bg-[#0D0D1A] text-white rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-white/60 mb-1">{d.ticker} · {d.dateLabel}</p>
        <p className={`font-semibold ${d.y >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
          {d.y >= 0 ? '+' : ''}${Math.abs(d.y).toFixed(2)}
        </p>
        {d.emotion && <p className="text-white/50 text-xs mt-0.5">{d.emotion}</p>}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [showHelp, setShowHelp] = useState(false)
  const [timelineRange, setTimelineRange] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

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
      const fetchedTrades = data ?? []
      setTrades(fetchedTrades)
      if (fetchedTrades.length > 0) {
        const latestTrade = [...fetchedTrades].sort((a, b) => b.date.localeCompare(a.date))[0]
        setSelectedMonth((current) => current || toMonthKey(latestTrade.date))
      } else {
        setSelectedMonth(new Date().toISOString().slice(0, 7))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // ─── Setup stats — use all unique setup types from actual trades ───────────
  const allSetupTypes = Array.from(new Set(trades.map(t => t.setup_type).filter(Boolean)))
  const setupStats: SetupStat[] = allSetupTypes.map((setup) => {
    const setupTrades = trades.filter((t) => t.setup_type === setup)
    const wins = setupTrades.filter((t) => (t.pnl ?? 0) > 0).length
    const winRate = setupTrades.length > 0 ? (wins / setupTrades.length) * 100 : 0
    const totalPnl = setupTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    return {
      setup,
      shortName: SETUP_SHORT[setup] ?? (setup.length > 16 ? setup.slice(0, 14) + '…' : setup),
      winRate: parseFloat(winRate.toFixed(1)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      tradeCount: setupTrades.length,
    }
  }).filter(s => s.tradeCount > 0).sort((a, b) => b.tradeCount - a.tradeCount)

  // ─── Day of week stats ────────────────────────────────────────────────────
  const pnlByDayOfWeek: DayOfWeekStat[] = DAYS_OF_WEEK.map((day) => {
    const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(day)
    const targetDay = dayIndex + 1
    const dayTrades = trades.filter((t) => {
      const [year, month, d] = t.date.split('-').map(Number)
      const date = new Date(year, month - 1, d)
      return date.getDay() === targetDay
    })
    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    return { day, pnl: parseFloat(pnl.toFixed(2)) }
  })

  // ─── Monthly P&L ──────────────────────────────────────────────────────────
  const monthMap: Record<string, number> = {}
  for (const trade of trades) {
    const month = trade.date.slice(0, 7)
    monthMap[month] = (monthMap[month] ?? 0) + (trade.pnl ?? 0)
  }
  const pnlByMonth: MonthStat[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))

  function formatMonth(m: string): string {
    const [year, month] = m.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // ─── P&L Calendar ─────────────────────────────────────────────────────────
  const monthOptions = Object.keys(monthMap).sort((a, b) => b.localeCompare(a))
  const activeMonth = selectedMonth || monthOptions[0] || new Date().toISOString().slice(0, 7)
  const [calYear, calMonth] = activeMonth.split('-').map(Number)
  const firstOfMonth = new Date(calYear, calMonth - 1, 1)
  const firstCalendarDay = new Date(firstOfMonth)
  firstCalendarDay.setDate(firstCalendarDay.getDate() - firstCalendarDay.getDay())

  const pnlByDate: Record<string, { pnl: number; tradeCount: number }> = {}
  for (const trade of trades) {
    const key = trade.date
    if (!pnlByDate[key]) pnlByDate[key] = { pnl: 0, tradeCount: 0 }
    pnlByDate[key].pnl += trade.pnl ?? 0
    pnlByDate[key].tradeCount += 1
  }

  const calendarDays: CalendarDay[] = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(firstCalendarDay)
    day.setDate(firstCalendarDay.getDate() + i)
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const data = pnlByDate[date]
    return {
      date,
      day: day.getDate(),
      pnl: parseFloat((data?.pnl ?? 0).toFixed(2)),
      tradeCount: data?.tradeCount ?? 0,
      isCurrentMonth: day.getMonth() === calMonth - 1,
    }
  })
  const calendarMonthTrades = trades.filter((t) => toMonthKey(t.date) === activeMonth)
  const calendarMonthPnl = calendarMonthTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const calendarWinningDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0 && d.pnl > 0).length
  const calendarLosingDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0 && d.pnl < 0).length
  const calendarTradedDays = calendarDays.filter((d) => d.isCurrentMonth && d.tradeCount > 0).length

  // ─── Summary stats ────────────────────────────────────────────────────────
  const winners = trades.filter((t) => (t.pnl ?? 0) > 0)
  const losers = trades.filter((t) => (t.pnl ?? 0) < 0)
  const avgWinner = winners.length > 0
    ? winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winners.length : 0
  const avgLoser = losers.length > 0
    ? losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losers.length : 0
  const bestSetup = setupStats.filter((s) => s.tradeCount > 0).sort((a, b) => b.totalPnl - a.totalPnl)[0]
  const bestDay = [...pnlByDayOfWeek].sort((a, b) => b.pnl - a.pnl)[0]

  // ─── Emotion stats ────────────────────────────────────────────────────────
  const emotionStats: EmotionStat[] = EMOTIONS.map((emotion) => {
    const emotionTrades = trades.filter((t) => t.emotion === emotion)
    const wins = emotionTrades.filter((t) => (t.pnl ?? 0) > 0).length
    const winRate = emotionTrades.length > 0 ? (wins / emotionTrades.length) * 100 : 0
    return {
      emotion,
      winRate: parseFloat(winRate.toFixed(1)),
      tradeCount: emotionTrades.length,
      category: EMOTION_CATEGORY[emotion] ?? 'neutral',
    }
  }).filter((s) => s.tradeCount > 0)

  const hasEmotionData = emotionStats.length > 0

  // ─── Timeline scatter data ────────────────────────────────────────────────
  const timelineCutoff = timelineRange === 'all' ? 0
    : Date.now() - (timelineRange === '7d' ? 7 : timelineRange === '30d' ? 30 : 90) * 86400000

  const emotionTimelineData: TimelineDot[] = trades
    .filter((t) => {
      if (!t.emotion || t.pnl === null) return false
      if (timelineRange === 'all') return true
      const [y, m, d] = t.date.split('-').map(Number)
      return new Date(y, m - 1, d).getTime() >= timelineCutoff
    })
    .map((t) => {
      const [year, month, day] = t.date.split('-').map(Number)
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      const emotion = t.emotion as string
      return {
        x: new Date(year, month - 1, day).getTime(),
        y: t.pnl as number,
        date: t.date,
        dateLabel: `${mm}/${dd}`,
        emotion,
        ticker: t.ticker,
        color: (['Calm','Confident','Focused','Patient'] as string[]).includes(emotion) ? '#22C55E'
             : (['Anxious','Fearful','Frustrated','Revenge','Overconfident','Greedy'] as string[]).includes(emotion) ? '#EF4444'
             : '#F59E0B',
      }
    })
    .sort((a, b) => a.x - b.x)

  const greenEmotionDots = emotionTimelineData.filter((d) => d.color === '#22C55E')
  const yellowEmotionDots = emotionTimelineData.filter((d) => d.color === '#F59E0B')
  const redEmotionDots = emotionTimelineData.filter((d) => d.color === '#EF4444')
  const hasTimelineData = emotionTimelineData.length > 0

  const emotionXDomain: [number, number] | ['auto', 'auto'] = emotionTimelineData.length > 0
    ? [Math.min(...emotionTimelineData.map((d) => d.x)), Math.max(...emotionTimelineData.map((d) => d.x))]
    : ['auto', 'auto']

  const isEmpty = trades.length === 0

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />
      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0D0D1A]">Analytics</h1>
              <button
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full border border-[#0D0D1A] text-[#0D0D1A] text-sm font-bold hover:bg-[#0D0D1A] hover:text-white transition-colors flex items-center justify-center"
                aria-label="Help"
              >
                ?
              </button>
            </div>
            <p className="text-sm text-[#0D0D1A]/50 mt-0.5">
              Performance insights across your trade history.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D0D1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-4 md:p-6 mb-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#0D0D1A]">P&amp;L Calendar</h2>
                    <p className="text-xs text-[#0D0D1A]/45 mt-1">Daily P&amp;L by traded day. Green days paid you. Red days charged tuition.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={activeMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-10 rounded-xl border border-[#E2DDD6] bg-[#F8F5EF] px-3 text-sm font-medium text-[#0D0D1A] outline-none focus:border-[#0D0D1A]"
                    >
                      {(monthOptions.length > 0 ? monthOptions : [activeMonth]).map((m) => (
                        <option key={m} value={m}>{monthLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                  <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/45 font-semibold">Month P&amp;L</p>
                    <p className={`text-lg md:text-xl font-bold ${calendarMonthPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{calendarMonthPnl >= 0 ? '+' : ''}${Math.abs(calendarMonthPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/45 font-semibold">Traded Days</p>
                    <p className="text-lg md:text-xl font-bold text-[#0D0D1A]">{calendarTradedDays}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F5EF] border border-[#E2DDD6] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#0D0D1A]/45 font-semibold">Green / Red</p>
                    <p className="text-lg md:text-xl font-bold text-[#0D0D1A]"><span className="text-[#22C55E]">{calendarWinningDays}</span> / <span className="text-[#EF4444]">{calendarLosingDays}</span></p>
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
                    return (
                      <div
                        key={day.date}
                        className={`min-h-[70px] md:min-h-[96px] rounded-xl border p-2 flex flex-col justify-between transition-colors ${
                          !day.isCurrentMonth
                            ? 'bg-[#F8F5EF]/45 border-[#E2DDD6]/45 text-[#0D0D1A]/25'
                            : hasTrade && isGreen
                              ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#14532D]'
                              : hasTrade && isRed
                                ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#7F1D1D]'
                                : 'bg-[#F8F5EF] border-[#E2DDD6] text-[#0D0D1A]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs md:text-sm font-semibold opacity-70">{day.day}</span>
                          {hasTrade && <span className="text-[9px] md:text-[10px] font-semibold opacity-60">{day.tradeCount}x</span>}
                        </div>
                        {hasTrade ? (
                          <div>
                            <p className={`text-xs md:text-base font-extrabold leading-tight ${isGreen ? 'text-[#16A34A]' : isRed ? 'text-[#DC2626]' : 'text-[#0D0D1A]'}`}>{formatMoney(day.pnl)}</p>
                            <p className="text-[9px] md:text-[10px] opacity-55 mt-0.5">P&amp;L</p>
                          </div>
                        ) : (
                          <p className="text-[10px] opacity-30">—</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Chart 1: Win Rate by Setup */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Win Rate by Setup</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={setupStats} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#0D0D1A', opacity: 0.6, angle: -35, textAnchor: 'end' }} axisLine={false} tickLine={false} height={64} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} width={36} />
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
                    <BarChart data={setupStats} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#0D0D1A', opacity: 0.6, angle: -35, textAnchor: 'end' }} axisLine={false} tickLine={false} height={64} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={formatDollar} width={48} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="totalPnl" radius={[6, 6, 0, 0]}>
                        {setupStats.map((entry, index) => (
                          <Cell key={index} fill={entry.totalPnl >= 0 ? '#22C55E' : '#EF4444'} fillOpacity={entry.tradeCount > 0 ? 1 : 0.2} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 3: P&L by Day of Week */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                  <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">P&amp;L by Day of Week</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={pnlByDayOfWeek} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={formatDollar} width={48} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                        {pnlByDayOfWeek.map((entry, index) => (
                          <Cell key={index} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} />
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
                      <BarChart data={pnlByMonth.map((m) => ({ ...m, label: formatMonth(m.month) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={formatDollar} width={48} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                          {pnlByMonth.map((entry, index) => (
                            <Cell key={index} fill={entry.pnl >= 0 ? '#22C55E' : '#EF4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Summary stats row */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6 mb-6">
                <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">Avg Winner</p>
                    <p className="text-xl font-bold text-[#22C55E]">
                      {winners.length > 0 ? `+$${avgWinner.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">Avg Loser</p>
                    <p className="text-xl font-bold text-[#EF4444]">
                      {losers.length > 0 ? `-$${Math.abs(avgLoser).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">Best Setup</p>
                    <p className="text-lg font-bold text-[#0D0D1A]">
                      {bestSetup ? SETUP_SHORT[bestSetup.setup] ?? bestSetup.setup : '—'}
                    </p>
                    {bestSetup && bestSetup.tradeCount > 0 && (
                      <p className="text-xs text-[#0D0D1A]/40 mt-0.5">
                        {bestSetup.totalPnl >= 0 ? '+' : ''}${Math.abs(bestSetup.totalPnl).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#0D0D1A]/50 uppercase tracking-wide mb-1">Best Day</p>
                    <p className="text-lg font-bold text-[#0D0D1A]">{bestDay ? bestDay.day : '—'}</p>
                    {bestDay && (
                      <p className="text-xs text-[#0D0D1A]/40 mt-0.5">
                        {bestDay.pnl >= 0 ? '+' : ''}${Math.abs(bestDay.pnl).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emotion & Performance */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#0D0D1A] mb-1">Emotion & Performance</h2>
                  <p className="text-sm text-[#0D0D1A]/50">How your emotional state correlates with trading outcomes.</p>
                </div>

                {!hasEmotionData ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-8 text-center">
                    <p className="text-sm text-[#0D0D1A]/40">Log trades with emotion data to see this chart.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Emotion Win Rate bar chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                      <h3 className="text-base font-semibold text-[#0D0D1A] mb-1">Win Rate by Emotion</h3>
                      <p className="text-xs text-[#0D0D1A]/40 mb-4">Green = focused mindset · Red = reactive mindset</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={emotionStats}
                          margin={{ top: 4, right: 8, left: 0, bottom: 24 }}
                          layout="vertical"
                        >
                          <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" horizontal={false} />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: '#0D0D1A', opacity: 0.6 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `${v}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="emotion"
                            tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.7 }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                          />
                          <Tooltip content={<WinRateTooltip />} />
                          <Bar dataKey="winRate" radius={[0, 6, 6, 0]}>
                            {emotionStats.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={
                                  entry.category === 'positive' ? '#22C55E'
                                  : entry.category === 'negative' ? '#EF4444'
                                  : '#F59E0B'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Emotion P&L timeline scatter */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-semibold text-[#0D0D1A]">P&amp;L Timeline by Emotion</h3>
                        <div className="flex items-center gap-1">
                          {(['7d','30d','90d','all'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setTimelineRange(r)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                timelineRange === r
                                  ? 'bg-[#0D0D1A] text-white'
                                  : 'bg-[#EDE8DF] text-[#0D0D1A]/60 hover:text-[#0D0D1A]'
                              }`}
                            >
                              {r === 'all' ? 'All' : r === '7d' ? '7D' : r === '30d' ? '30D' : '90D'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex items-center gap-1 text-xs text-[#0D0D1A]/50">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#22C55E]" /> Positive Mindset
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#0D0D1A]/50">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Neutral
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#0D0D1A]/50">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#EF4444]" /> Negative Mindset
                        </span>
                      </div>
                      {!hasTimelineData ? (
                        <div className="flex items-center justify-center h-[250px]">
                          <p className="text-sm text-[#0D0D1A]/40">Log trades with emotions to see your pattern</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
                            <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" />
                            <XAxis
                              dataKey="x"
                              type="number"
                              domain={emotionXDomain as [number, number]}
                              scale="time"
                              ticks={(() => {
                                const [min, max] = emotionXDomain as [number, number]
                                if (!min || !max || min === max) return []
                                const count = 6
                                const step = (max - min) / (count - 1)
                                return Array.from({ length: count }, (_, i) => Math.round(min + i * step))
                              })()}
                              tickFormatter={(v: number) => {
                                const d = new Date(v)
                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }}
                              tick={{ fontSize: 10, fill: '#0D0D1A', opacity: 0.6, angle: -30, textAnchor: 'end', dy: 4 }}
                              axisLine={false}
                              tickLine={false}
                              height={44}
                            />
                            <YAxis
                              dataKey="y"
                              tick={{ fontSize: 10, fill: '#0D0D1A', opacity: 0.6 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={formatDollar}
                              width={48}
                            />
                            <ZAxis range={[40, 40]} />
                            <Tooltip content={<ScatterTooltip />} />
                            <Scatter data={greenEmotionDots} fill="#22C55E" fillOpacity={0.85} />
                            <Scatter data={yellowEmotionDots} fill="#F59E0B" fillOpacity={0.85} />
                            <Scatter data={redEmotionDots} fill="#EF4444" fillOpacity={0.85} />
                          </ScatterChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <MobileNav />

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Reading Your Analytics"
        sections={[
          { label: 'Win Rate by Setup', desc: 'Your best setups ranked. Double down on what works.' },
          { label: 'P&L by Setup', desc: 'Different from win rate — a setup can win 80% but lose money if losers are too big.' },
          { label: 'Best Day of Week', desc: 'Some traders perform better on specific days. This reveals it.' },
          { label: 'P&L Calendar', desc: 'See exactly which days paid you and which days cost you. Multiple trades on one day are grouped into that day’s net P&L.' },
          { label: 'Monthly P&L', desc: 'Trend over time. Are you improving month over month?' },
          { label: 'Emotion and Performance', desc: 'The most powerful chart. If Anxious trades consistently lose, that IS your edge — stop taking them.' },
        ]}
        tip="Sort by emotion first. Most traders find 1 or 2 emotional states that cause 80% of their losses."
      />
    </div>
  )
}
