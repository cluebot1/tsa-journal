import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRADE_FIELDS = [
  'date',
  'ticker',
  'direction',
  'setup_type',
  'catalyst',
  'key_level',
  'strat_setup',
  'risk_amount',
  'entry_price',
  'exit_price',
  'contracts',
  'pnl',
  'notes',
  'screenshot_urls',
  'emotion',
  'followed_plan',
  'what_went_right',
  'what_went_wrong',
  'lessons',
] as const

type TradeInput = Record<string, unknown>

function cleanTrade(input: TradeInput, userId: string) {
  const trade: Record<string, unknown> = { user_id: userId }

  for (const field of TRADE_FIELDS) {
    if (field in input) trade[field] = input[field]
  }

  if (typeof trade.ticker === 'string') trade.ticker = trade.ticker.toUpperCase()

  return trade
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ trades: data ?? [], userEmail: user.email })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const body = await request.json()
  const rawTrades = Array.isArray(body.trades) ? body.trades : body.trade ? [body.trade] : []

  if (!rawTrades.length) {
    return NextResponse.json({ error: 'No trade data provided.' }, { status: 400 })
  }

  const trades = rawTrades.map((trade: TradeInput) => cleanTrade(trade, user.id))

  const { data: insertedTrades, error } = await supabase
    .from('trades')
    .insert(trades)
    .select('id, ticker, date, notes')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  let journalCount = 0
  if (body.createJournalFromNotes) {
    const journalInserts = (insertedTrades ?? [])
      .filter((trade) => typeof trade.notes === 'string' && trade.notes.trim())
      .map((trade) => ({
        user_id: user.id,
        trade_id: trade.id,
        date: trade.date,
        title: `${trade.ticker} — ${trade.date}`,
        content: trade.notes,
        mood: null,
      }))

    if (journalInserts.length > 0) {
      const { error: journalError } = await supabase.from('journal_entries').insert(journalInserts)
      if (!journalError) journalCount = journalInserts.length
    }
  }

  return NextResponse.json({ ok: true, trades: insertedTrades ?? [], journalCount })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { id, trade } = await request.json()

  if (typeof id !== 'string' || !trade) {
    return NextResponse.json({ error: 'Trade ID and trade data are required.' }, { status: 400 })
  }

  const cleanedTrade = cleanTrade(trade, user.id)
  delete cleanedTrade.user_id

  const { error } = await supabase
    .from('trades')
    .update(cleanedTrade)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { ids } = await request.json()
  const tradeIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []

  if (!tradeIds.length) {
    return NextResponse.json({ error: 'No trades selected.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', user.id)
    .in('id', tradeIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
