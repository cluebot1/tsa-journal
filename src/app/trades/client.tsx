'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
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

const PAGE_SIZE = 20

interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  setup: string
  direction: 'Long' | 'Short'
  pnl: number | null
  notes?: string | null
  created_at?: string
}

const setupColors: Record<string, string> = {
  '30-Min ORB': 'bg-blue-50 text-blue-700 border border-blue-100',
  'Gap Strategy': 'bg-purple-50 text-purple-700 border border-purple-100',
  '4H Reversal': 'bg-amber-50 text-amber-700 border border-amber-100',
  'Key Level Reaction': 'bg-teal-50 text-teal-700 border border-teal-100',
  'Broadening Formation Breakout': 'bg-pink-50 text-pink-700 border border-pink-100',
}

function formatPnl(pnl: number | null): string {
  if (pnl === null) return '—'
  const abs = Math.abs(pnl)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${pnl >= 0 ? '+' : '-'}$${formatted}`
}

function formatDateDisplay(dateStr: string): string {
  try {
    // Parse date in local time to avoid UTC shift
    const [year, month, day] = dateStr.split('-').map(Number)
    return format(new Date(year, month - 1, day), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

// --- CSV helpers ---
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes }
    else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += line[i] }
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, '')
}

function mapHeader(h: string): string | null {
  const n = normalizeHeader(h)
  if (['date'].includes(n)) return 'date'
  if (['symbol','ticker','stock'].includes(n)) return 'ticker'
  if (['direction','side','type'].includes(n)) return 'direction'
  if (['setup','setuptype'].includes(n)) return 'setup_type'
  if (['entry','entryprice'].includes(n)) return 'entry_price'
  if (['exit','exitprice'].includes(n)) return 'exit_price'
  if (['pnl','pandl','profit','net','netpnl'].includes(n)) return 'pnl'
  if (['contracts','qty','quantity'].includes(n)) return 'contracts'
  if (['risk','riskamount'].includes(n)) return 'risk_amount'
  if (['emotion'].includes(n)) return 'emotion'
  if (['catalyst','whyitradedit','whytraded','why','reason'].includes(n)) return 'catalyst'
  if (['tradetype','expiry'].includes(n)) return 'trade_type'
  if (['outcome','result'].includes(n)) return null
  if (['notes','comments','journal','reflection','reflectionnotes'].includes(n)) return 'notes'
  if (['followedplan','plan'].includes(n)) return 'followed_plan'
  if (['cumulativepnl','runningpnl'].includes(n)) return null
  return null
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  // M/D/YYYY or MM/DD/YYYY or M/D/YY
  const parts = cleaned.split('/')
  if (parts.length === 3) {
    let [m, d, y] = parts.map(Number)
    if (y < 100) y += 2000
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  return null
}

function mapSetupType(raw: string): string {
  if (!raw || !raw.trim()) return 'Other'
  const v = raw.toLowerCase().trim()
  if (v.includes('orb') || v.includes('opening range') || v.includes('30') || v.includes('30min') || v.includes('30-min')) return '30-Min ORB'
  if (v.includes('gap') && (v.includes('go') || v.includes('fill') || v.includes('strategy') || v.includes('cont'))) return 'Gap Strategy'
  if (v.includes('gap')) return 'Gap Strategy'
  if (v.includes('4h') || v.includes('4hr') || v.includes('4-h') || v.includes('four') || (v.includes('reversal') && !v.includes('key'))) return '4H Reversal'
  // Key Level Break + Retest must be checked before Key Level Reaction
  if ((v.includes('break') && v.includes('retest')) || (v.includes('key') && v.includes('break')) || (v.includes('kl') && v.includes('break'))) return 'Key Level Break + Retest'
  if (v.includes('key level') || v.includes('key lvl') || v.includes('s/r') || v.includes('support') || v.includes('resistance') || v.includes('reaction')) return 'Key Level Reaction'
  if (v.includes('broadening') || v.includes('formation') || v.includes('breakout') || v.includes('bfb')) return 'Broadening Formation Breakout'
  if (v.includes('trend') || v.includes('continuation') || v.includes('2-2')) return 'Trend Continuation'
  if (v.includes('earnings') && v.includes('straddle')) return 'Earnings Straddle'
  return raw.trim()
}

function mapFollowedPlan(raw: string): string | null {
  const v = raw.toLowerCase().trim()
  if (['yes','y','true','1','yep','yeah'].includes(v)) return 'yes'
  if (['no','n','false','0','nope','nah'].includes(v)) return 'no'
  if (['partially','partial','kinda','somewhat','sort of','mostly'].includes(v)) return 'partially'
  return null
}

function mapDirection(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const v = raw.toLowerCase().trim()
  if (['buy','long','call','b','l'].includes(v)) return 'long'
  if (['sell','short','put','s'].includes(v)) return 'short'
  if (['straddle','strangle','both'].includes(v)) return 'straddle'
  return null // unrecognized = null, won't violate constraint
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [filterSetup, setFilterSetup] = useState<string>('all')
  const [filterTicker, setFilterTicker] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [csvParsed, setCsvParsed] = useState<Record<string, string>[]>([])
  const [csvImporting, setCsvImporting] = useState(false)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email)

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        toast.error('Failed to load trades.')
        return
      }

      setTrades(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSetup, filterTicker])

  // --- Filtering ---
  const filteredTrades = trades.filter((t) => {
    const matchesSetup = filterSetup === 'all' || t.setup === filterSetup
    const matchesTicker =
      filterTicker.trim() === '' ||
      t.ticker.toLowerCase().includes(filterTicker.trim().toLowerCase())
    return matchesSetup && matchesTicker
  })

  // --- Summary ---
  const totalFilteredPnl = filteredTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE))
  const paginated = filteredTrades.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // --- CSV Import ---
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { toast.error('CSV is empty or has no data rows.'); return }
      const headers = parseCSVLine(lines[0])
      const mapped = headers.map(mapHeader)
      const rows: Record<string, string>[] = []
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i])
        const row: Record<string, string> = {}
        mapped.forEach((key, idx) => { if (key) row[key] = vals[idx] ?? '' })
        if (row.date || row.ticker) rows.push(row)
      }
      setCsvParsed(rows)
      setCsvPreview(rows.slice(0, 5))
    }
    reader.readAsText(file)
  }

  async function handleCsvImport() {
    if (!csvParsed.length) return
    setCsvImporting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const inserts = csvParsed.map(row => {
        let notesText = row.notes && row.notes.trim() ? row.notes.trim() : null
        if (row.trade_type && row.trade_type.trim()) {
          const prefix = `[${row.trade_type.trim()}]`
          notesText = notesText ? `${prefix} ${notesText}` : prefix
        }
        return {
          user_id: user.id,
          date: parseDate(row.date ?? '') ?? new Date().toISOString().split("T")[0],
          ticker: (row.ticker ?? 'UNKNOWN').toUpperCase(),
          direction: row.direction ? mapDirection(row.direction) : null,
          setup_type: row.setup_type ? mapSetupType(row.setup_type) : 'Other',
          entry_price: row.entry_price ? parseFloat(row.entry_price.replace(/[$,]/g,'')) : null,
          exit_price: row.exit_price ? parseFloat(row.exit_price.replace(/[$,]/g,'')) : null,
          pnl: row.pnl ? parseFloat(row.pnl.replace(/[$,]/g,'')) : null,
          contracts: row.contracts ? parseInt(row.contracts) : null,
          risk_amount: row.risk_amount ? parseFloat(row.risk_amount.replace(/[$,]/g,'')) : null,
          notes: notesText,
          emotion: row.emotion ?? null,
          catalyst: row.catalyst ?? null,
          followed_plan: row.followed_plan ? mapFollowedPlan(row.followed_plan) : null,
        }
      })
      const { data: insertedTrades, error } = await supabase.from('trades').insert(inserts).select('id, ticker, date, notes')
      if (error) { toast.error('Import failed: ' + error.message); return }

      const journalInserts = (insertedTrades ?? [])
        .filter(t => t.notes && t.notes.trim())
        .map(t => ({
          user_id: user.id,
          trade_id: t.id,
          date: t.date,
          title: `${t.ticker} — ${t.date}`,
          content: t.notes,
          mood: null,
        }))

      let journalCount = 0
      if (journalInserts.length > 0) {
        const { error: journalError } = await supabase.from('journal_entries').insert(journalInserts)
        if (!journalError) journalCount = journalInserts.length
      }

      const tradeCount = inserts.length
      toast.success(journalCount > 0
        ? `${tradeCount} trades imported + ${journalCount} journal entries created`
        : `${tradeCount} trades imported!`
      )
      setShowCsvModal(false)
      setCsvParsed([])
      setCsvPreview([])
      await fetchTrades()
    } finally {
      setCsvImporting(false)
    }
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    if (!confirm('Delete this trade? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('trades').delete().eq('id', id)
      if (error) {
        toast.error('Failed to delete trade.')
      } else {
        toast.success('Trade deleted.')
        await fetchTrades()
      }
    } finally {
      setDeletingId(null)
    }
  }

  // --- Select helpers ---
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(t => t.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} trade${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('trades').delete().in('id', Array.from(selectedIds))
      if (error) {
        toast.error('Failed to delete trades.')
      } else {
        toast.success(`${selectedIds.size} trade${selectedIds.size > 1 ? 's' : ''} deleted.`)
        setSelectedIds(new Set())
        await fetchTrades()
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0D0D1A]">Trade Log</h1>
              <button
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full border border-[#0D0D1A] text-[#0D0D1A] text-sm font-bold hover:bg-[#0D0D1A] hover:text-white transition-colors flex items-center justify-center"
                aria-label="Help"
              >
                ?
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCsvModal(true)}
                className="bg-white border border-[#E2DDD6] text-[#0D0D1A] text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import CSV
              </button>
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
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
              <span className="text-sm font-medium text-red-700">{selectedIds.size} trade{selectedIds.size > 1 ? 's' : ''} selected</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="text-sm text-[#6B6B6B] hover:text-[#0D0D1A] transition-colors">Clear</button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={filterSetup}
              onChange={(e) => setFilterSetup(e.target.value)}
              className="bg-white border border-[#E2DDD6] text-[#0D0D1A] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]/20 w-full sm:w-auto"
            >
              <option value="all">All Setups</option>
              {SETUPS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter by ticker..."
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              className="bg-white border border-[#E2DDD6] text-[#0D0D1A] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]/20 w-full sm:w-52 placeholder:text-[#0D0D1A]/30"
            />
          </div>

          {/* Summary bar */}
          {!loading && filteredTrades.length > 0 && (
            <div className="flex items-center gap-4 mb-4 px-1">
              <p className="text-sm text-[#0D0D1A]/60">
                <span className="font-semibold text-[#0D0D1A]">{filteredTrades.length}</span>{' '}
                {filteredTrades.length === 1 ? 'trade' : 'trades'}
              </p>
              <span className="text-[#E2DDD6]">|</span>
              <p className="text-sm text-[#0D0D1A]/60">
                Total P&amp;L:{' '}
                <span
                  className={`font-semibold ${
                    totalFilteredPnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {formatPnl(totalFilteredPnl)}
                </span>
              </p>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-6 py-4 border-b border-[#E2DDD6] last:border-0"
                >
                  <Skeleton className="h-4 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-16 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-16 rounded-lg ml-auto" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredTrades.length === 0 && (
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
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#0D0D1A] mb-2">
                {trades.length === 0 ? 'No trades yet' : 'No trades match your filters'}
              </h2>
              <p className="text-sm text-[#0D0D1A]/50 mb-6 max-w-xs">
                {trades.length === 0
                  ? 'Start logging your trades to build your performance history.'
                  : 'Try adjusting your setup or ticker filter.'}
              </p>
              {trades.length === 0 && (
                <Link
                  href="/trades/new"
                  className="bg-[#0D0D1A] text-white text-sm font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Log Your First Trade
                </Link>
              )}
            </div>
          )}

          {/* Desktop table */}
          {!loading && paginated.length > 0 && (
            <>
              <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-[#E2DDD6] overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2DDD6] bg-[#EDE8DF]/40">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={paginated.length > 0 && selectedIds.size === paginated.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-[#0D0D1A] cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        Ticker
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        Setup
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        Direction
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        P&amp;L
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#0D0D1A]/50 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((trade) => {
                      const pnl = trade.pnl ?? 0
                      const isWin = pnl > 0
                      const isLoss = pnl < 0
                      return (
                        <tr
                          key={trade.id}
                          className={`border-b border-[#E2DDD6] last:border-0 hover:bg-[#EDE8DF]/30 transition-colors ${selectedIds.has(trade.id) ? 'bg-[#EDE8DF]/50' : ''}`}
                        >
                          <td className="px-4 py-4 w-10">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(trade.id)}
                              onChange={() => toggleSelect(trade.id)}
                              className="w-4 h-4 rounded accent-[#0D0D1A] cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-[#0D0D1A]/60 whitespace-nowrap">
                            {formatDateDisplay(trade.date)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#0D0D1A]">
                            {trade.ticker}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                setupColors[trade.setup] ?? 'bg-gray-50 text-gray-700 border border-gray-100'
                              }`}
                            >
                              {trade.setup}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                trade.direction === 'Long'
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}
                            >
                              {trade.direction}
                            </span>
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                              isWin
                                ? 'text-[#22C55E]'
                                : isLoss
                                ? 'text-[#EF4444]'
                                : 'text-[#0D0D1A]'
                            }`}
                          >
                            {formatPnl(trade.pnl)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/trades/${trade.id}`}
                                className="text-xs font-medium text-[#0D0D1A]/60 hover:text-[#0D0D1A] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#EDE8DF]"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(trade.id)}
                                disabled={deletingId === trade.id}
                                className="text-xs font-medium text-[#EF4444]/70 hover:text-[#EF4444] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
                              >
                                {deletingId === trade.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden grid grid-cols-1 gap-3 mb-4">
                {paginated.map((trade) => {
                  const pnl = trade.pnl ?? 0
                  const isWin = pnl > 0
                  const isLoss = pnl < 0
                  return (
                    <div
                      key={trade.id}
                      className={`bg-white rounded-2xl shadow-sm border p-4 ${selectedIds.has(trade.id) ? 'border-[#0D0D1A]' : 'border-[#E2DDD6]'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(trade.id)}
                            onChange={() => toggleSelect(trade.id)}
                            className="w-4 h-4 rounded accent-[#0D0D1A] cursor-pointer mt-0.5"
                          />
                          <div>
                            <p className="font-bold text-[#0D0D1A] text-base">{trade.ticker}</p>
                            <p className="text-xs text-[#0D0D1A]/50 mt-0.5">{formatDateDisplay(trade.date)}</p>
                          </div>
                        </div>
                        <p className={`text-base font-bold ${isWin ? 'text-[#22C55E]' : isLoss ? 'text-[#EF4444]' : 'text-[#0D0D1A]'}`}>
                          {formatPnl(trade.pnl)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            setupColors[trade.setup] ?? 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {trade.setup}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                            trade.direction === 'Long'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#E2DDD6]">
                        <Link
                          href={`/trades/${trade.id}`}
                          className="flex-1 text-center text-xs font-medium text-[#0D0D1A]/60 hover:text-[#0D0D1A] transition-colors py-1.5 rounded-lg hover:bg-[#EDE8DF]"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          disabled={deletingId === trade.id}
                          className="flex-1 text-center text-xs font-medium text-[#EF4444]/70 hover:text-[#EF4444] transition-colors py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === trade.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-[#0D0D1A] bg-white border border-[#E2DDD6] rounded-xl hover:bg-[#EDE8DF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-[#0D0D1A]/60">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-[#0D0D1A] bg-white border border-[#E2DDD6] rounded-xl hover:bg-[#EDE8DF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileNav />

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Using Your Trade Log"
        sections={[
          { label: 'Filter by Setup', desc: 'See which of your 5 setups performs best over time.' },
          { label: 'Search by Ticker', desc: 'Review all your trades on a specific stock or index.' },
          { label: 'Click a Trade', desc: 'View the full CKSR breakdown and journal notes for any trade.' },
          { label: 'Import CSV', desc: 'Upload your existing spreadsheet and trades auto-populate.' },
        ]}
        tip="After 20+ trades you will start seeing clear patterns — which setup wins most, which emotion costs you."
      />

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0D0D1A]">Import Trades from CSV</h2>
              <button onClick={() => { setShowCsvModal(false); setCsvParsed([]); setCsvPreview([]) }} className="text-[#6B6B6B] hover:text-[#0D0D1A] text-xl font-light">✕</button>
            </div>

            {csvPreview.length === 0 ? (
              <div>
                <p className="text-sm text-[#6B6B6B] mb-3">Upload your trade spreadsheet CSV. Columns auto-mapped from: Date, Ticker/Symbol, Direction, Setup, Entry, Exit, P&L, Contracts, Notes, Emotion.</p>
                <label className="block w-full border-2 border-dashed border-[#E2DDD6] rounded-xl p-8 text-center cursor-pointer hover:border-[#0D0D1A] transition-colors">
                  <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-sm text-[#6B6B6B]">Click to upload .csv file</p>
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
                </label>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#22C55E] font-medium mb-3">✓ {csvParsed.length} trades found — preview (first 5):</p>
                <div className="overflow-x-auto mb-4">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b border-[#E2DDD6]">
                        {Object.keys(csvPreview[0] || {}).map(k => (
                          <th key={k} className="text-left px-2 py-1 text-[#6B6B6B] font-medium capitalize">{k.replace(/_/g,' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-b border-[#E2DDD6]/50">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-[#0D0D1A] truncate max-w-[100px]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setCsvParsed([]); setCsvPreview([]) }} className="flex-1 border border-[#E2DDD6] text-[#0D0D1A] text-sm py-2.5 rounded-xl hover:opacity-80 transition-opacity">Re-upload</button>
                  <button onClick={handleCsvImport} disabled={csvImporting} className="flex-1 bg-[#0D0D1A] text-white text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                    {csvImporting ? 'Importing...' : `Import ${csvParsed.length} Trades`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
