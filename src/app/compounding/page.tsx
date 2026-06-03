export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompoundingClient from './client'

export interface CompoundTrade {
  date: string
  pnl: number | null
}

export default async function CompoundingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('starting_balance')
    .eq('id', user.id)
    .single()

  const { data: trades } = await supabase
    .from('trades')
    .select('date, pnl')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  return (
    <CompoundingClient
      userEmail={user.email ?? ''}
      initialStartingBalance={profile?.starting_balance ?? null}
      trades={(trades ?? []) as CompoundTrade[]}
    />
  )
}
