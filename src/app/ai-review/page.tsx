'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

interface Trade {
  id: string
  date: string
  ticker: string
  direction: string | null
  setup_type: string | null
  catalyst?: string | null
  key_level?: string | null
  strat_setup?: string | null
  entry_price?: number | null
  exit_price?: number | null
  contracts?: number | null
  risk_amount?: number | null
  pnl: number | null
  emotion?: string | null
  followed_plan?: string | null
  what_went_right?: string | null
  what_went_wrong?: string | null
  lessons?: string | null
  notes?: string | null
  created_at?: string | null
}

const REVIEW_TRADE_COUNT = 14

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const abs = Math.abs(Number(value))
  return `${Number(value) >= 0 ? '+' : '-'}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return String(value)
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function normalizePlan(value?: string | null): string {
  if (!value) return 'Not logged'
  const v = value.toLowerCase()
  if (v === 'yes') return 'Yes'
  if (v === 'no') return 'No'
  if (v === 'partially') return 'Partially'
  return value
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function groupStats(trades: Trade[], keyFn: (trade: Trade) => string) {
  const groups = new Map<string, { count: number; pnl: number; wins: number; losses: number }>()
  for (const trade of trades) {
    const key = keyFn(trade) || 'Not logged'
    const current = groups.get(key) ?? { count: 0, pnl: 0, wins: 0, losses: 0 }
    const pnl = Number(trade.pnl ?? 0)
    current.count += 1
    current.pnl += pnl
    if (pnl > 0) current.wins += 1
    if (pnl < 0) current.losses += 1
    groups.set(key, current)
  }
  return Array.from(groups.entries())
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl) || b.count - a.count)
}

function buildTradeDataBlock(trades: Trade[]): string {
  if (trades.length === 0) return 'No trades found.'

  return trades.map((trade, index) => {
    const pnl = Number(trade.pnl ?? 0)
    const outcome = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Breakeven'
    return [
      `TRADE ${index + 1}`,
      `Date: ${trade.date}`,
      `Ticker: ${trade.ticker || 'Not logged'}`,
      `Direction: ${trade.direction || 'Not logged'}`,
      `Setup: ${trade.setup_type || 'Not logged'}`,
      `Catalyst / Why I Traded It: ${trade.catalyst || 'Not logged'}`,
      `Key Level: ${trade.key_level || 'Not logged'}`,
      `Strat Setup: ${trade.strat_setup || 'Not logged'}`,
      `Entry: ${formatNumber(trade.entry_price)}`,
      `Exit: ${formatNumber(trade.exit_price)}`,
      `Contracts / Size: ${formatNumber(trade.contracts)}`,
      `Risk Amount: ${formatMoney(trade.risk_amount)}`,
      `P&L: ${formatMoney(trade.pnl)}`,
      `Outcome: ${outcome}`,
      `Emotion: ${trade.emotion || 'Not logged'}`,
      `Followed Plan: ${normalizePlan(trade.followed_plan)}`,
      `What Went Right: ${trade.what_went_right || 'Not logged'}`,
      `What Went Wrong: ${trade.what_went_wrong || 'Not logged'}`,
      `Lessons: ${trade.lessons || 'Not logged'}`,
      `Reflection / Notes: ${trade.notes || 'Not logged'}`,
    ].join('\n')
  }).join('\n\n---\n\n')
}

function buildStatsBlock(trades: Trade[]): string {
  const totalTrades = trades.length
  const winners = trades.filter((t) => Number(t.pnl ?? 0) > 0)
  const losers = trades.filter((t) => Number(t.pnl ?? 0) < 0)
  const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
  const avgWin = winners.length ? winners.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0) / winners.length : 0
  const avgLoss = losers.length ? losers.reduce((sum, t) => sum + Math.abs(Number(t.pnl ?? 0)), 0) / losers.length : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0

  const setupStats = groupStats(trades, (t) => t.setup_type || 'Not logged').slice(0, 6)
  const emotionStats = groupStats(trades, (t) => t.emotion || 'Not logged').slice(0, 6)
  const planStats = groupStats(trades, (t) => normalizePlan(t.followed_plan)).slice(0, 6)

  const formatGroup = (label: string, rows: ReturnType<typeof groupStats>) => {
    if (rows.length === 0) return `${label}: Not enough data`
    return `${label}:\n${rows.map((r) => `- ${r.name}: ${r.count} trade${r.count === 1 ? '' : 's'}, ${pct(r.wins, r.count)} win rate, ${formatMoney(r.pnl)} total P&L`).join('\n')}`
  }

  return [
    `Review Window: Last ${totalTrades} tracked trade${totalTrades === 1 ? '' : 's'}`,
    `Total P&L: ${formatMoney(totalPnl)}`,
    `Win Rate: ${pct(winners.length, totalTrades)} (${winners.length}W / ${losers.length}L / ${totalTrades - winners.length - losers.length}BE)`,
    `Average Winner: ${winners.length ? formatMoney(avgWin) : '—'}`,
    `Average Loser: ${losers.length ? `-${formatMoney(avgLoss).replace('+', '')}` : '—'}`,
    `Approx. Reward/Risk: ${avgLoss > 0 ? `${rr.toFixed(2)}R` : '—'}`,
    '',
    formatGroup('Setup Breakdown', setupStats),
    '',
    formatGroup('Emotion Breakdown', emotionStats),
    '',
    formatGroup('Followed Plan Breakdown', planStats),
  ].join('\n')
}

function buildAiPrompt(trades: Trade[]): string {
  const statsBlock = buildStatsBlock(trades)
  const tradeDataBlock = buildTradeDataBlock(trades)

  return `You are a direct, disciplined trading performance coach trained in The Strat, CKSR, risk management, and execution psychology.\n\nAnalyze my last ${trades.length} tracked trades from my TSA Trade Journal. Do not give generic motivation. Use my actual data. Be direct, practical, and specific.\n\nImportant context:\n- I am trying to become a more disciplined trader, not chase signals.\n- Focus on process, execution, risk management, emotional control, and trade selection.\n- Do not give financial advice or tell me what ticker to buy/sell next.\n- Help me identify repeatable behavior patterns and rules I can apply in my next 10 trading days.\n\nI want your review in this exact structure:\n\n1. EXECUTIVE SUMMARY\n- Give me the blunt truth in 3-5 bullets.\n\n2. WHAT IS WORKING\n- Identify the patterns, setups, emotions, or behaviors connected to my best trades.\n\n3. WHAT IS COSTING ME MONEY\n- Identify the biggest leaks: cutting winners, holding losers, revenge trading, FOMO, overtrading, skipping A+ setups, bad sizing, bad timing, not following plan, poor R:R, or anything else the data shows.\n\n4. EXECUTION SCORECARD\nRate me 1-10 in each area and explain why:\n- Setup quality\n- Entry discipline\n- Exit discipline\n- Risk/reward\n- Emotional control\n- Following the plan\n\n5. MY TOP 3 RULES FOR THE NEXT 10 TRADING DAYS\n- Make these rules simple, measurable, and strict.\n\n6. ONE MAIN FOCUS\n- If I could only fix one thing first, what should it be and why?\n\n7. JOURNAL PROMPTS\n- Give me 5 short journal prompts I should answer after each trade to fix my biggest weakness.\n\nHere are my calculated stats:\n\n${statsBlock}\n\nHere is my trade-by-trade data:\n\n${tradeDataBlock}`
}

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.success(successMessage)
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AiReviewPage() {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email)

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(REVIEW_TRADE_COUNT)

      if (error) {
        toast.error('Failed to load your trade review data.')
        return
      }

      setTrades(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
    })
  }, [trades])

  const statsBlock = useMemo(() => buildStatsBlock(sortedTrades), [sortedTrades])
  const tradeDataBlock = useMemo(() => buildTradeDataBlock(sortedTrades), [sortedTrades])
  const aiPrompt = useMemo(() => buildAiPrompt(sortedTrades), [sortedTrades])

  const totalPnl = sortedTrades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
  const winners = sortedTrades.filter((t) => Number(t.pnl ?? 0) > 0).length
  const losers = sortedTrades.filter((t) => Number(t.pnl ?? 0) < 0).length

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#0D0D1A]/50 mb-2">TSA AI Review Export</p>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0D0D1A]">Get AI feedback on your trading.</h1>
              <p className="text-sm text-[#0D0D1A]/55 mt-2 max-w-2xl">
                Copy an AI-ready review of your last 14 tracked trades. Paste it into ChatGPT to get specific feedback on execution, emotions, risk management, and setup quality.
              </p>
            </div>
            <Link
              href="/trades/new"
              className="bg-[#0D0D1A] text-white text-sm font-semibold px-4 py-3 rounded-xl hover:opacity-90 transition-opacity text-center"
            >
              Log Trade
            </Link>
          </div>

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
              <div className="space-y-4">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
              </div>
              <Skeleton className="h-[520px] rounded-2xl" />
            </div>
          )}

          {!loading && sortedTrades.length === 0 && (
            <div className="bg-white rounded-3xl border border-[#E2DDD6] shadow-sm p-8 text-center">
              <div className="text-4xl mb-4">🧠</div>
              <h2 className="text-xl font-bold text-[#0D0D1A] mb-2">No trades to review yet</h2>
              <p className="text-sm text-[#0D0D1A]/55 mb-6 max-w-md mx-auto">
                Log at least a few trades first. The AI review gets sharper as your journal gets more honest and complete.
              </p>
              <Link href="/trades/new" className="inline-flex bg-[#0D0D1A] text-white px-5 py-3 rounded-xl text-sm font-semibold">
                Log Your First Trade
              </Link>
            </div>
          )}

          {!loading && sortedTrades.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
              <div className="space-y-4">
                <div className="bg-[#0D0D1A] text-white rounded-3xl p-6 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/45 mb-3">Review Window</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-2xl font-bold">{sortedTrades.length}</p>
                      <p className="text-xs text-white/45">Trades</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-[#22C55E]' : 'text-[#F87171]'}`}>{formatMoney(totalPnl)}</p>
                      <p className="text-xs text-white/45">Total P&amp;L</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pct(winners, sortedTrades.length)}</p>
                      <p className="text-xs text-white/45">Win Rate</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/45 mt-4">{winners} wins · {losers} losses · {sortedTrades.length - winners - losers} breakeven</p>
                </div>

                <div className="bg-white rounded-3xl border border-[#E2DDD6] shadow-sm p-5">
                  <h2 className="font-bold text-[#0D0D1A] mb-2">How students use this</h2>
                  <ol className="space-y-2 text-sm text-[#0D0D1A]/60 list-decimal pl-5">
                    <li>Log trades honestly, including emotion and followed-plan status.</li>
                    <li>Tap <span className="font-semibold text-[#0D0D1A]">Copy AI Prompt</span>.</li>
                    <li>Paste into ChatGPT and ask for your review.</li>
                    <li>Pick one rule from the review and apply it for the next 10 trading days.</li>
                  </ol>
                </div>

                <div className="bg-white rounded-3xl border border-[#E2DDD6] shadow-sm p-5">
                  <h2 className="font-bold text-[#0D0D1A] mb-2">Best results come from complete logs</h2>
                  <p className="text-sm text-[#0D0D1A]/60">
                    The review is strongest when each trade has a setup, catalyst, emotion, followed-plan answer, and reflection notes. Missing fields are included as “Not logged” so the AI can call out weak journaling too.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
                  <h2 className="font-bold text-amber-950 mb-2">Education only</h2>
                  <p className="text-sm text-amber-900/70">
                    This export is for trade review and education. It should not be used as financial advice or as instructions to enter future trades.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#E2DDD6] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#E2DDD6]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-[#0D0D1A]">AI-ready trade review</h2>
                      <p className="text-xs text-[#0D0D1A]/45 mt-1">Last {sortedTrades.length} trades, calculated stats, and a TSA-specific prompt.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => copyToClipboard(aiPrompt, 'AI prompt copied.')}
                        className="bg-[#0D0D1A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Copy AI Prompt
                      </button>
                      <button
                        onClick={() => downloadText(`tsa-ai-review-${new Date().toISOString().split('T')[0]}.txt`, aiPrompt)}
                        className="bg-[#EDE8DF] text-[#0D0D1A] text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => copyToClipboard(statsBlock, 'Stats copied.')}
                      className="border border-[#E2DDD6] rounded-xl px-4 py-3 text-sm font-semibold text-[#0D0D1A] hover:bg-[#EDE8DF]/60 transition-colors"
                    >
                      Copy Stats Only
                    </button>
                    <button
                      onClick={() => copyToClipboard(tradeDataBlock, 'Trade data copied.')}
                      className="border border-[#E2DDD6] rounded-xl px-4 py-3 text-sm font-semibold text-[#0D0D1A] hover:bg-[#EDE8DF]/60 transition-colors"
                    >
                      Copy Trade Data Only
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/45 mb-2">Preview</p>
                    <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#0D0D1A] text-white/85 text-xs leading-relaxed p-4 font-mono">
                      {aiPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
