import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import DeleteTradeButton from '@/components/DeleteTradeButton'

interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  direction: 'long' | 'short'
  setup_type: string
  catalyst?: string | null
  key_level?: string | null
  strat_setup?: string | null
  risk_amount?: number | null
  entry_price?: number | null
  exit_price?: number | null
  contracts?: number | null
  premium_paid?: number | null
  pnl?: number | null
  notes?: string | null
  screenshot_urls?: string[] | null
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'MMMM d, yyyy')
  } catch {
    return dateStr
  }
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: trade, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .single<Trade>()

  if (error || !trade) {
    redirect('/trades')
  }

  if (trade.user_id !== user.id) {
    redirect('/trades')
  }

  const pnlValue = trade.pnl ?? null
  const pnlPositive = pnlValue != null && pnlValue >= 0

  const cksr = [
    {
      letter: 'C',
      label: 'Catalyst',
      value: trade.catalyst,
    },
    {
      letter: 'K',
      label: 'Key Level',
      value: trade.key_level,
    },
    {
      letter: 'S',
      label: 'Strat Setup',
      value: trade.strat_setup,
    },
    {
      letter: 'R',
      label: 'Risk Amount',
      value: trade.risk_amount != null ? formatCurrency(trade.risk_amount) : null,
    },
  ]

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={user.email} />

      <main className="max-w-3xl mx-auto pt-16 pb-20 px-4 space-y-5">
        {/* Back link */}
        <div className="pt-8">
          <Link
            href="/trades"
            className="text-sm text-[#0D0D1A]/50 hover:text-[#0D0D1A] transition-colors"
          >
            ← Back to Trades
          </Link>
        </div>

        {/* Trade Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-[#0D0D1A] tracking-tight">
                  {trade.ticker}
                </h1>
                {/* Direction badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                    trade.direction === 'long'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {trade.direction === 'long' ? '↑ Long' : '↓ Short'}
                </span>
                {/* Setup type badge */}
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#EDE8DF] text-[#0D0D1A]/70">
                  {trade.setup_type}
                </span>
              </div>
              <p className="text-sm text-[#0D0D1A]/50 mt-2">{formatDate(trade.date)}</p>
            </div>

            {/* P&L Display */}
            {pnlValue != null && (
              <div className="text-right">
                <p className="text-xs text-[#0D0D1A]/40 uppercase tracking-wide font-medium mb-0.5">
                  P&L
                </p>
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    pnlPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {pnlPositive ? '+' : ''}
                  {formatCurrency(pnlValue)}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-[#E2DDD6]">
            <Link
              href={`/trades/${trade.id}/edit`}
              className="bg-[#0D0D1A] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Edit Trade
            </Link>
            <DeleteTradeButton tradeId={trade.id} />
          </div>
        </div>

        {/* CKSR Framework */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
          <h2 className="text-base font-bold text-[#0D0D1A] mb-4">CKSR Framework</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cksr.map(({ letter, label, value }) => (
              <div
                key={letter}
                className="bg-[#EDE8DF] rounded-xl p-3 flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <span className="bg-[#0D0D1A] text-white text-xs font-bold rounded px-1.5 py-0.5 leading-none">
                    {letter}
                  </span>
                  <span className="text-xs text-[#0D0D1A]/50 font-medium">{label}</span>
                </div>
                <p className="text-sm font-medium text-[#0D0D1A] break-words">
                  {value ?? <span className="text-[#0D0D1A]/30 font-normal">—</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
          <h2 className="text-base font-bold text-[#0D0D1A] mb-4">Execution</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#0D0D1A]/40 uppercase tracking-wide font-medium mb-1">
                Entry
              </p>
              <p className="text-sm font-semibold text-[#0D0D1A]">
                {formatCurrency(trade.entry_price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#0D0D1A]/40 uppercase tracking-wide font-medium mb-1">
                Exit
              </p>
              <p className="text-sm font-semibold text-[#0D0D1A]">
                {formatCurrency(trade.exit_price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#0D0D1A]/40 uppercase tracking-wide font-medium mb-1">
                Contracts
              </p>
              <p className="text-sm font-semibold text-[#0D0D1A]">
                {trade.contracts ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#0D0D1A]/40 uppercase tracking-wide font-medium mb-1">
                Premium Paid
              </p>
              <p className="text-sm font-semibold text-[#0D0D1A]">
                {formatCurrency(trade.premium_paid)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {trade.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
            <h2 className="text-base font-bold text-[#0D0D1A] mb-3">Notes</h2>
            <div className="bg-[#EDE8DF] rounded-xl p-4">
              <p className="text-sm text-[#0D0D1A]/80 whitespace-pre-wrap leading-relaxed">
                {trade.notes}
              </p>
            </div>
          </div>
        )}

        {/* Screenshots */}
        {Array.isArray(trade.screenshot_urls) && trade.screenshot_urls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
            <h2 className="text-base font-bold text-[#0D0D1A] mb-3">Screenshots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trade.screenshot_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-[#E2DDD6] hover:border-[#0D0D1A]/30 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Screenshot ${idx + 1}`}
                    className="w-full object-cover max-h-64 bg-[#EDE8DF]"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement | null
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div
                    className="hidden items-center justify-center h-24 text-sm text-[#0D0D1A]/40"
                  >
                    Screenshot {idx + 1} (click to open)
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
