'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'

const SETUP_TYPES = [
  '30-Min ORB',
  'Gap Strategy',
  '4H Reversal',
  'Key Level Reaction',
  'Broadening Formation Breakout',
]

const inputClass =
  'border border-[#E2DDD6] rounded-xl px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]/20 text-[#0D0D1A] placeholder:text-gray-400 text-sm'

const labelClass = 'block text-xs font-semibold text-[#0D0D1A]/60 mb-1 uppercase tracking-wide'

const sectionClass = 'bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6 space-y-5'

const sectionTitleClass = 'text-base font-bold text-[#0D0D1A] mb-4'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export default function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()

  const [tradeId, setTradeId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [date, setDate] = useState(today())
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [setupType, setSetupType] = useState('')
  const [catalyst, setCatalyst] = useState('')
  const [keyLevel, setKeyLevel] = useState('')
  const [stratSetup, setStratSetup] = useState('')
  const [riskAmount, setRiskAmount] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [contracts, setContracts] = useState('')
  const [premiumPaid, setPremiumPaid] = useState('')
  const [pnl, setPnl] = useState('')
  const [notes, setNotes] = useState('')
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([''])

  // Track if we should auto-calculate PNL
  const [autoCalcPnl, setAutoCalcPnl] = useState(false)

  useEffect(() => {
    async function load() {
      const { id } = await params
      setTradeId(id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email)

      const { data: trade, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !trade) {
        setNotFound(true)
        setLoading(false)
        return
      }

      if (trade.user_id !== user.id) {
        router.push('/trades')
        return
      }

      // Populate form state
      setDate(trade.date ?? today())
      setTicker(trade.ticker ?? '')
      setDirection(trade.direction === 'short' ? 'short' : 'long')
      setSetupType(trade.setup_type ?? '')
      setCatalyst(trade.catalyst ?? '')
      setKeyLevel(trade.key_level ?? '')
      setStratSetup(trade.strat_setup ?? '')
      setRiskAmount(trade.risk_amount != null ? String(trade.risk_amount) : '')
      setEntryPrice(trade.entry_price != null ? String(trade.entry_price) : '')
      setExitPrice(trade.exit_price != null ? String(trade.exit_price) : '')
      setContracts(trade.contracts != null ? String(trade.contracts) : '')
      setPremiumPaid(trade.premium_paid != null ? String(trade.premium_paid) : '')
      setPnl(trade.pnl != null ? String(trade.pnl) : '')
      setNotes(trade.notes ?? '')
      setScreenshotUrls(
        Array.isArray(trade.screenshot_urls) && trade.screenshot_urls.length > 0
          ? trade.screenshot_urls
          : ['']
      )

      setLoading(false)
    }
    load()
  }, [])

  // Auto-calculate P&L when relevant fields change (only when user clears override)
  useEffect(() => {
    if (!autoCalcPnl) return
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const qty = parseFloat(contracts)
    const premium = parseFloat(premiumPaid)

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(qty) && !isNaN(premium)) {
      const calc = (exit - entry) * qty * 100 - premium * qty
      setPnl(calc.toFixed(2))
    }
  }, [entryPrice, exitPrice, contracts, premiumPaid, autoCalcPnl])

  function addScreenshotUrl() {
    setScreenshotUrls((prev) => [...prev, ''])
  }

  function removeScreenshotUrl(index: number) {
    setScreenshotUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function updateScreenshotUrl(index: number, value: string) {
    setScreenshotUrls((prev) => prev.map((url, i) => (i === index ? value : url)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!date || !ticker || !setupType) {
      toast.error('Date, ticker, and setup type are required.')
      return
    }

    if (!tradeId) return
    setSubmitting(true)

    try {
      const filteredUrls = screenshotUrls.filter((u) => u.trim() !== '')

      const { error } = await supabase
        .from('trades')
        .update({
          date,
          ticker: ticker.toUpperCase(),
          direction,
          setup_type: setupType,
          catalyst: catalyst || null,
          key_level: keyLevel || null,
          strat_setup: stratSetup || null,
          risk_amount: riskAmount ? parseFloat(riskAmount) : null,
          entry_price: entryPrice ? parseFloat(entryPrice) : null,
          exit_price: exitPrice ? parseFloat(exitPrice) : null,
          contracts: contracts ? parseInt(contracts) : null,
          premium_paid: premiumPaid ? parseFloat(premiumPaid) : null,
          pnl: pnl ? parseFloat(pnl) : null,
          notes: notes || null,
          screenshot_urls: filteredUrls.length > 0 ? filteredUrls : null,
        })
        .eq('id', tradeId)

      if (error) throw error

      toast.success('Trade updated!')
      router.push(`/trades/${tradeId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update trade.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EDE8DF]">
        <NavBar userEmail={userEmail} />
        <main className="max-w-3xl mx-auto pt-24 pb-28 px-4">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2DDD6] p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                  <div className="h-10 bg-gray-100 rounded-xl" />
                  <div className="h-10 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#EDE8DF]">
        <NavBar userEmail={userEmail} />
        <main className="max-w-3xl mx-auto pt-24 pb-28 px-4 text-center">
          <h1 className="text-xl font-bold text-[#0D0D1A] mb-2">Trade not found</h1>
          <Link href="/trades" className="text-sm text-[#0D0D1A]/60 hover:text-[#0D0D1A]">
            ← Back to Trades
          </Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="max-w-3xl mx-auto pt-24 pb-28 px-4 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D0D1A]">Edit Trade</h1>
            <p className="text-sm text-[#0D0D1A]/50 mt-0.5">Update your CKSR trade record</p>
          </div>
          <Link
            href={tradeId ? `/trades/${tradeId}` : '/trades'}
            className="text-sm text-[#0D0D1A]/60 hover:text-[#0D0D1A] transition-colors"
          >
            ← Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trade Details */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>Trade Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Ticker</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. SPY, AAPL"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Direction Toggle */}
            <div>
              <label className={labelClass}>Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('long')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    direction === 'long'
                      ? 'bg-[#22C55E] text-white border-[#22C55E]'
                      : 'bg-white text-[#0D0D1A]/60 border-[#E2DDD6] hover:border-[#22C55E]/50'
                  }`}
                >
                  Long ↑
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('short')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    direction === 'short'
                      ? 'bg-[#EF4444] text-white border-[#EF4444]'
                      : 'bg-white text-[#0D0D1A]/60 border-[#E2DDD6] hover:border-[#EF4444]/50'
                  }`}
                >
                  Short ↓
                </button>
              </div>
            </div>

            {/* Setup Type */}
            <div>
              <label className={labelClass}>Setup Type</label>
              <select
                value={setupType}
                onChange={(e) => setSetupType(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select a setup...</option>
                {SETUP_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CKSR Framework */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>CKSR Framework</h2>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <span className="bg-[#0D0D1A] text-white text-xs font-bold rounded-md px-1.5 py-0.5">C</span>
                  Catalyst
                </span>
              </label>
              <input
                type="text"
                value={catalyst}
                onChange={(e) => setCatalyst(e.target.value)}
                placeholder="e.g. Earnings beat, Fed announcement, sector rotation"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <span className="bg-[#0D0D1A] text-white text-xs font-bold rounded-md px-1.5 py-0.5">K</span>
                  Key Level
                </span>
              </label>
              <input
                type="text"
                value={keyLevel}
                onChange={(e) => setKeyLevel(e.target.value)}
                placeholder="e.g. $450 support, prior day high"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <span className="bg-[#0D0D1A] text-white text-xs font-bold rounded-md px-1.5 py-0.5">S</span>
                  Strat Setup
                </span>
              </label>
              <input
                type="text"
                value={stratSetup}
                onChange={(e) => setStratSetup(e.target.value)}
                placeholder="e.g. 2U + FTFC bullish"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <span className="bg-[#0D0D1A] text-white text-xs font-bold rounded-md px-1.5 py-0.5">R</span>
                  Risk Amount ($)
                </span>
              </label>
              <input
                type="number"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                placeholder="e.g. 250"
                step="0.01"
                min="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* Execution */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>Execution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Entry Price ($)</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => { setEntryPrice(e.target.value); setAutoCalcPnl(true) }}
                  placeholder="e.g. 4.50"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Exit Price ($)</label>
                <input
                  type="number"
                  value={exitPrice}
                  onChange={(e) => { setExitPrice(e.target.value); setAutoCalcPnl(true) }}
                  placeholder="e.g. 6.80"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contracts</label>
                <input
                  type="number"
                  value={contracts}
                  onChange={(e) => { setContracts(e.target.value); setAutoCalcPnl(true) }}
                  placeholder="e.g. 5"
                  step="1"
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Premium Paid ($ per contract)</label>
                <input
                  type="number"
                  value={premiumPaid}
                  onChange={(e) => { setPremiumPaid(e.target.value); setAutoCalcPnl(true) }}
                  placeholder="e.g. 4.50"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                P&L ($)
                {autoCalcPnl && entryPrice && exitPrice && contracts && premiumPaid && (
                  <span className="ml-2 text-[#0D0D1A]/40 normal-case font-normal">
                    (auto-calculated — edit to override)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={pnl}
                onChange={(e) => { setPnl(e.target.value); setAutoCalcPnl(false) }}
                placeholder="e.g. 1150.00"
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes & Screenshots */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>Notes & Screenshots</h2>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trade rationale, emotions, lessons learned..."
                rows={4}
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label className={labelClass}>Screenshot URLs</label>
              <div className="space-y-2">
                {screenshotUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateScreenshotUrl(idx, e.target.value)}
                      placeholder="https://..."
                      className={`${inputClass} flex-1`}
                    />
                    {screenshotUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeScreenshotUrl(idx)}
                        className="px-3 py-2 rounded-xl border border-[#E2DDD6] bg-white text-[#EF4444] hover:bg-red-50 text-sm font-medium transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addScreenshotUrl}
                  className="text-sm text-[#0D0D1A]/60 hover:text-[#0D0D1A] border border-dashed border-[#E2DDD6] rounded-xl px-4 py-2 w-full transition-colors hover:border-[#0D0D1A]/30"
                >
                  + Add Screenshot URL
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#0D0D1A] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={tradeId ? `/trades/${tradeId}` : '/trades'}
              className="px-6 py-3 rounded-xl border border-[#E2DDD6] bg-white text-[#0D0D1A]/70 text-sm font-medium hover:bg-[#EDE8DF] transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>

      <MobileNav />
    </div>
  )
}
