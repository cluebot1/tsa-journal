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

export default function NewTradePage() {
  const router = useRouter()
  const supabase = createClient()

  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email)
    }
    loadUser()
  }, [])

  // Auto-calculate P&L hint
  useEffect(() => {
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const qty = parseFloat(contracts)
    const premium = parseFloat(premiumPaid)

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(qty) && !isNaN(premium)) {
      const calc = (exit - entry) * qty * 100 - premium * qty
      setPnl(calc.toFixed(2))
    }
  }, [entryPrice, exitPrice, contracts, premiumPaid])

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

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not authenticated.')
        router.push('/login')
        return
      }

      const filteredUrls = screenshotUrls.filter((u) => u.trim() !== '')

      const { error } = await supabase.from('trades').insert({
        user_id: user.id,
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

      if (error) throw error

      toast.success('Trade logged!')
      router.push('/trades')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save trade.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="max-w-3xl mx-auto pt-24 pb-28 px-4 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0D0D1A]">Log a Trade</h1>
            <p className="text-sm text-[#0D0D1A]/50 mt-0.5">Record your CKSR trade setup</p>
          </div>
          <Link
            href="/trades"
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
              {/* Date */}
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

              {/* Ticker */}
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

            {/* C — Catalyst */}
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

            {/* K — Key Level */}
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

            {/* S — Strat Setup */}
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

            {/* R — Risk Amount */}
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
                  onChange={(e) => setEntryPrice(e.target.value)}
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
                  onChange={(e) => setExitPrice(e.target.value)}
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
                  onChange={(e) => setContracts(e.target.value)}
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
                  onChange={(e) => setPremiumPaid(e.target.value)}
                  placeholder="e.g. 4.50"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
            </div>

            {/* P&L */}
            <div>
              <label className={labelClass}>
                P&L ($)
                {entryPrice && exitPrice && contracts && premiumPaid && (
                  <span className="ml-2 text-[#0D0D1A]/40 normal-case font-normal">
                    (auto-calculated — edit to override)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
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
              {submitting ? 'Saving...' : 'Log Trade'}
            </button>
            <Link
              href="/trades"
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
