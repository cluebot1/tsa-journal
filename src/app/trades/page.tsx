'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
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

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [filterSetup, setFilterSetup] = useState<string>('all')
  const [filterTicker, setFilterTicker] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#0D0D1A]">Trade Log</h1>
            <Link
              href="/trades/new"
              className="bg-[#0D0D1A] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Log Trade
            </Link>
          </div>

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
                          className="border-b border-[#E2DDD6] last:border-0 hover:bg-[#EDE8DF]/30 transition-colors"
                        >
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
                      className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-[#0D0D1A] text-base">{trade.ticker}</p>
                          <p className="text-xs text-[#0D0D1A]/50 mt-0.5">
                            {formatDateDisplay(trade.date)}
                          </p>
                        </div>
                        <p
                          className={`text-base font-bold ${
                            isWin ? 'text-[#22C55E]' : isLoss ? 'text-[#EF4444]' : 'text-[#0D0D1A]'
                          }`}
                        >
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
    </div>
  )
}
