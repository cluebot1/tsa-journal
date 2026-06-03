'use client'

import { useMemo, useState } from 'react'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import type { CompoundTrade } from './page'

type RowStatus = 'ahead' | 'behind' | 'on-track' | 'future'

interface Props {
  userEmail: string
  initialStartingBalance: number | null
  trades: CompoundTrade[]
}

interface PlanRow {
  day: number
  dateLabel: string
  targetDailyProfit: number
  targetBalance: number
  actualPnl: number | null
  actualBalance: number | null
  difference: number | null
  status: RowStatus
}

function money(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function percent(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`
}

function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function nextTradingDate(start: Date, offset: number): string {
  const date = new Date(start)
  let added = 0
  while (added < offset) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return date.toISOString().slice(0, 10)
}

export default function CompoundingClient({ userEmail, initialStartingBalance, trades }: Props) {
  const [startingBalance, setStartingBalance] = useState(
    initialStartingBalance != null ? String(initialStartingBalance) : '1000'
  )
  const [dailyTarget, setDailyTarget] = useState('2')
  const [planDays, setPlanDays] = useState('30')

  const plan = useMemo(() => {
    const start = Math.max(Number(startingBalance) || 0, 0)
    const rate = Math.max(Number(dailyTarget) || 0, 0) / 100
    const days = Math.min(Math.max(Number(planDays) || 1, 1), 252)

    const pnlByDate = trades.reduce<Record<string, number>>((acc, trade) => {
      acc[trade.date] = (acc[trade.date] ?? 0) + (trade.pnl ?? 0)
      return acc
    }, {})

    const actualDates = Object.keys(pnlByDate).sort()
    const firstDate = actualDates[0] ? new Date(`${actualDates[0]}T12:00:00`) : new Date()
    let previousTargetBalance = start
    let runningActualBalance = start

    const rows: PlanRow[] = Array.from({ length: days }, (_, index) => {
      const day = index + 1
      const date = actualDates[index] ?? nextTradingDate(firstDate, index)
      const targetDailyProfit = previousTargetBalance * rate
      const targetBalance = previousTargetBalance + targetDailyProfit
      previousTargetBalance = targetBalance

      const actualPnl = actualDates[index] ? pnlByDate[actualDates[index]] : null
      let actualBalance: number | null = null
      let difference: number | null = null
      let status: RowStatus = 'future'

      if (actualPnl != null) {
        runningActualBalance += actualPnl
        actualBalance = runningActualBalance
        difference = actualBalance - targetBalance
        status = Math.abs(difference) < 0.01 ? 'on-track' : difference > 0 ? 'ahead' : 'behind'
      }

      return {
        day,
        dateLabel: shortDate(date),
        targetDailyProfit,
        targetBalance,
        actualPnl,
        actualBalance,
        difference,
        status,
      }
    })

    const finalTargetBalance = rows[rows.length - 1]?.targetBalance ?? start
    const totalTargetProfit = finalTargetBalance - start
    const completedRows = rows.filter((row) => row.actualBalance != null)
    const latestActualBalance = completedRows.at(-1)?.actualBalance ?? start
    const latestTargetBalance = completedRows.at(-1)?.targetBalance ?? start
    const actualVsPlan = latestActualBalance - latestTargetBalance

    return {
      rows,
      start,
      rate,
      days,
      finalTargetBalance,
      totalTargetProfit,
      completedCount: completedRows.length,
      latestActualBalance,
      latestTargetBalance,
      actualVsPlan,
    }
  }, [startingBalance, dailyTarget, planDays, trades])

  const statusColor: Record<RowStatus, string> = {
    ahead: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    behind: 'bg-red-50 text-red-700 border-red-200',
    'on-track': 'bg-blue-50 text-blue-700 border-blue-200',
    future: 'bg-[#EDE8DF] text-[#0D0D1A]/45 border-[#E2DDD6]',
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto py-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0D0D1A]/40 mb-2">
              TSA Compounding Plan
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0D0D1A]">
              See the math before you force the trade.
            </h1>
            <p className="text-sm text-[#0D0D1A]/60 mt-2 max-w-3xl">
              Set your account size and target daily percentage. The table shows the ideal compounding path next to your logged journal results so you can see whether you are ahead, behind, or forcing outside the plan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <label className="bg-white border border-[#E2DDD6] rounded-2xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">
                Starting account
              </span>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0D0D1A]/45">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
              </div>
            </label>

            <label className="bg-white border border-[#E2DDD6] rounded-2xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">
                Daily target
              </span>
              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0D0D1A]/45">%</span>
              </div>
            </label>

            <label className="bg-white border border-[#E2DDD6] rounded-2xl p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">
                Trading days
              </span>
              <input
                type="number"
                min="1"
                max="252"
                step="1"
                value={planDays}
                onChange={(e) => setPlanDays(e.target.value)}
                className="w-full mt-2 px-4 py-3 rounded-xl border border-[#E2DDD6] bg-[#EDE8DF] text-[#0D0D1A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">Target account</p>
              <p className="text-xl font-bold text-[#0D0D1A] mt-2">{money(plan.finalTargetBalance)}</p>
              <p className="text-xs text-emerald-700 font-semibold mt-1">+{money(plan.totalTargetProfit)} planned</p>
            </div>
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">Target pace</p>
              <p className="text-xl font-bold text-[#0D0D1A] mt-2">{percent(Number(dailyTarget) || 0)} / day</p>
              <p className="text-xs text-[#0D0D1A]/50 mt-1">Compounded, not flat math</p>
            </div>
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">Actual journal</p>
              <p className="text-xl font-bold text-[#0D0D1A] mt-2">{money(plan.latestActualBalance)}</p>
              <p className="text-xs text-[#0D0D1A]/50 mt-1">{plan.completedCount} logged trading days</p>
            </div>
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0D0D1A]/50">Vs plan</p>
              <p className={`text-xl font-bold mt-2 ${plan.actualVsPlan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {plan.actualVsPlan >= 0 ? '+' : ''}{money(plan.actualVsPlan)}
              </p>
              <p className="text-xs text-[#0D0D1A]/50 mt-1">Compared to your logged-day target</p>
            </div>
          </div>

          <div className="bg-[#0D0D1A] text-white rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold mb-1">TSA rule</p>
            <p className="text-sm text-white/75">
              This is not a profit promise. It is a discipline map. If your target requires you to force bad setups, lower the target. Account growth comes from clean CKSR trades, defined risk, and not giving back progress.
            </p>
          </div>

          <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2DDD6] flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="font-bold text-[#0D0D1A]">Daily compounding breakdown</h2>
                <p className="text-xs text-[#0D0D1A]/50">Target path vs your actual logged journal growth.</p>
              </div>
              <div className="text-xs text-[#0D0D1A]/50">
                Start: {money(plan.start)} · Days: {plan.days} · Rate: {percent(plan.rate * 100)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#F7F3ED] text-[#0D0D1A]/55 uppercase text-[11px] tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">Day</th>
                    <th className="text-left px-5 py-3 font-bold">Date</th>
                    <th className="text-right px-5 py-3 font-bold">Daily goal</th>
                    <th className="text-right px-5 py-3 font-bold">Target balance</th>
                    <th className="text-right px-5 py-3 font-bold">Actual P&amp;L</th>
                    <th className="text-right px-5 py-3 font-bold">Actual balance</th>
                    <th className="text-right px-5 py-3 font-bold">Vs plan</th>
                    <th className="text-center px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD6]">
                  {plan.rows.map((row) => (
                    <tr key={row.day} className="hover:bg-[#F7F3ED]/60">
                      <td className="px-5 py-3 font-bold text-[#0D0D1A]">{row.day}</td>
                      <td className="px-5 py-3 text-[#0D0D1A]/60">{row.dateLabel}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#0D0D1A]">{money(row.targetDailyProfit)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#0D0D1A]">{money(row.targetBalance)}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${row.actualPnl == null ? 'text-[#0D0D1A]/30' : row.actualPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {row.actualPnl == null ? '—' : `${row.actualPnl >= 0 ? '+' : ''}${money(row.actualPnl)}`}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#0D0D1A]">
                        {row.actualBalance == null ? '—' : money(row.actualBalance)}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${row.difference == null ? 'text-[#0D0D1A]/30' : row.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {row.difference == null ? '—' : `${row.difference >= 0 ? '+' : ''}${money(row.difference)}`}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusColor[row.status]}`}>
                          {row.status === 'future' ? 'planned' : row.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
