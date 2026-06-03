'use client'

import { Fragment, useMemo, useState } from 'react'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import type { CompoundTrade } from './page'

interface Props {
  userEmail: string
  initialStartingBalance: number | null
  trades: CompoundTrade[]
}

interface RoadRow {
  day: number
  week: number
  initialBalance: number
  goal: number
  totalEarnings: number
  balance: number
}

interface AccountabilityRow {
  day: number
  week: number
  initialBalance: number
  dailyPnl: number | null
  totalEarnings: number | null
  endBalance: number | null
  vsRoadMap: number | null
}

function money(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function signedMoney(value: number): string {
  return `${value >= 0 ? '+' : '-'}${money(value)}`
}

function pct(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`
}

function WeekBreak({ week, columns }: { week: number; columns: number }) {
  return (
    <tr>
      <td colSpan={columns} className="bg-[#F4E7A1] text-center text-[10px] font-black text-[#0D0D1A] py-1 border border-[#111]">
        Week {week}
      </td>
    </tr>
  )
}

export default function CompoundingClient({ userEmail, initialStartingBalance, trades }: Props) {
  const [startingBalance, setStartingBalance] = useState(
    initialStartingBalance != null ? String(initialStartingBalance) : '3330'
  )
  const [dailyTarget, setDailyTarget] = useState('2')
  const [weeks, setWeeks] = useState('52')

  const data = useMemo(() => {
    const start = Math.max(Number(startingBalance) || 0, 0)
    const rate = Math.max(Number(dailyTarget) || 0, 0) / 100
    const weekCount = Math.min(Math.max(Number(weeks) || 1, 1), 52)
    const dayCount = weekCount * 5

    let roadBalance = start
    const roadRows: RoadRow[] = []
    for (let day = 1; day <= dayCount; day++) {
      const initialBalance = roadBalance
      const goal = initialBalance * rate
      const balance = initialBalance + goal
      roadRows.push({
        day,
        week: Math.ceil(day / 5),
        initialBalance,
        goal,
        totalEarnings: balance - start,
        balance,
      })
      roadBalance = balance
    }

    const pnlByDate = trades.reduce<Record<string, number>>((acc, trade) => {
      acc[trade.date] = (acc[trade.date] ?? 0) + (trade.pnl ?? 0)
      return acc
    }, {})
    const actualPnls = Object.keys(pnlByDate)
      .sort()
      .map((date) => pnlByDate[date])

    let actualBalance = start
    const accountabilityRows: AccountabilityRow[] = []
    for (let day = 1; day <= dayCount; day++) {
      const initialBalance = actualBalance
      const dailyPnl = actualPnls[day - 1] ?? null
      let totalEarnings: number | null = null
      let endBalance: number | null = null
      let vsRoadMap: number | null = null

      if (dailyPnl != null) {
        actualBalance += dailyPnl
        endBalance = actualBalance
        totalEarnings = endBalance - start
        vsRoadMap = endBalance - roadRows[day - 1].balance
      }

      accountabilityRows.push({
        day,
        week: Math.ceil(day / 5),
        initialBalance,
        dailyPnl,
        totalEarnings,
        endBalance,
        vsRoadMap,
      })
    }

    const finalRoadBalance = roadRows[roadRows.length - 1]?.balance ?? start
    const completedRows = accountabilityRows.filter((row) => row.endBalance != null)
    const latestActual = completedRows.length ? completedRows[completedRows.length - 1].endBalance! : start
    const latestRoad = completedRows.length ? roadRows[completedRows.length - 1].balance : start

    return {
      start,
      rate,
      weekCount,
      dayCount,
      roadRows,
      accountabilityRows,
      finalRoadBalance,
      totalRoadProfit: finalRoadBalance - start,
      completedDays: completedRows.length,
      latestActual,
      latestRoad,
      actualVsRoad: latestActual - latestRoad,
    }
  }, [startingBalance, dailyTarget, weeks, trades])

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />

      <main className="pt-16 pb-24 md:pb-10 px-3 md:px-4">
        <div className="max-w-7xl mx-auto py-6 md:py-8">
          <div className="mb-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0D0D1A]/45 mb-2">TSA Compounding Spreadsheet</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#0D0D1A]">Compounding Road Map + Accountability</h1>
              <p className="text-sm text-[#0D0D1A]/60 mt-2 max-w-3xl">
                The left side shows the ideal compound path. The right side compares it to the member’s actual logged journal P&amp;L.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-white border border-[#D8D0C4] rounded-2xl p-3">
              <label className="text-[10px] font-black uppercase text-[#0D0D1A]/50">
                Balance
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D0C4] bg-[#F7F3ED] px-2 py-2 text-sm font-bold text-[#0D0D1A] outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
              </label>
              <label className="text-[10px] font-black uppercase text-[#0D0D1A]/50">
                Daily %
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D0C4] bg-[#F7F3ED] px-2 py-2 text-sm font-bold text-[#0D0D1A] outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
              </label>
              <label className="text-[10px] font-black uppercase text-[#0D0D1A]/50">
                Weeks
                <input
                  type="number"
                  min="1"
                  max="52"
                  step="1"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D0C4] bg-[#F7F3ED] px-2 py-2 text-sm font-bold text-[#0D0D1A] outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-[#D8D0C4] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#0D0D1A]/45">Starting Account</p>
              <p className="text-lg font-black text-[#0D0D1A] mt-1">{money(data.start)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#D8D0C4] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#0D0D1A]/45">Road Map Target</p>
              <p className="text-lg font-black text-emerald-700 mt-1">{money(data.finalRoadBalance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#D8D0C4] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#0D0D1A]/45">Journal Progress</p>
              <p className="text-lg font-black text-[#0D0D1A] mt-1">{money(data.latestActual)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#D8D0C4] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#0D0D1A]/45">Actual vs Map</p>
              <p className={`text-lg font-black mt-1 ${data.actualVsRoad >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{signedMoney(data.actualVsRoad)}</p>
            </div>
          </div>

          <div className="mb-5 grid lg:grid-cols-2 gap-3 text-xs font-bold">
            <div className="bg-[#34D058] text-[#052E16] border-2 border-[#111] rounded-xl p-3">
              Change account size, daily target %, and weeks at the top. The Road Map recalculates automatically.
            </div>
            <div className="bg-[#FF2D2D] text-white border-2 border-[#111] rounded-xl p-3">
              Log real trade P&amp;L in the journal. The Accountability Sheet pulls that math automatically.
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-5 items-start">
            <section className="bg-white border-2 border-[#111] overflow-hidden shadow-sm">
              <div className="bg-[#0B4FD8] text-white text-center text-[11px] md:text-xs font-black py-2 border-b-2 border-[#111] uppercase">
                The School of Threaded Arts — TSA Compounding Road Map to {data.weekCount} Weeks of {pct(data.rate * 100)} Gains
              </div>
              <div className="overflow-x-auto max-h-[760px]">
                <table className="w-full min-w-[540px] text-[10px] md:text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#F3F3F3] text-[#0D0D1A]">
                      <th className="border border-[#111] py-1 px-2 text-left">DAY</th>
                      <th className="border border-[#111] py-1 px-2 text-right">INITIAL BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">{pct(data.rate * 100)} GOAL</th>
                      <th className="border border-[#111] py-1 px-2 text-right">TOTAL EARNINGS</th>
                      <th className="border border-[#111] py-1 px-2 text-right">BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roadRows.map((row, index) => (
                      <Fragment key={`road-group-${row.day}`}>
                        {index % 5 === 0 && <WeekBreak week={row.week} columns={5} />}
                        <tr className="odd:bg-white even:bg-[#FAFAFA]">
                          <td className="border border-[#999] py-1 px-2 font-bold">{row.day}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.initialBalance)}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.goal)}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.totalEarnings)}</td>
                          <td className="border border-[#999] py-1 px-2 text-right font-bold">{money(row.balance)}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border-2 border-[#111] overflow-hidden shadow-sm">
              <div className="bg-[#0B4FD8] text-white text-center text-[11px] md:text-xs font-black py-2 border-b-2 border-[#111] uppercase">
                Daily Compounding Accountability Sheet to Monitor Progress
              </div>
              <div className="overflow-x-auto max-h-[760px]">
                <table className="w-full min-w-[640px] text-[10px] md:text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#F3F3F3] text-[#0D0D1A]">
                      <th className="border border-[#111] py-1 px-2 text-left">DAY</th>
                      <th className="border border-[#111] py-1 px-2 text-right">INITIAL BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">DAILY P&amp;L</th>
                      <th className="border border-[#111] py-1 px-2 text-right">TOTAL EARNINGS</th>
                      <th className="border border-[#111] py-1 px-2 text-right">END BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">VS MAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accountabilityRows.map((row, index) => (
                      <Fragment key={`actual-group-${row.day}`}>
                        {index % 5 === 0 && <WeekBreak week={row.week} columns={6} />}
                        <tr className="odd:bg-white even:bg-[#FAFAFA]">
                          <td className="border border-[#999] py-1 px-2 font-bold">{row.day}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.initialBalance)}</td>
                          <td className={`border border-[#999] py-1 px-2 text-right font-bold ${row.dailyPnl == null ? 'text-[#999]' : row.dailyPnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.dailyPnl == null ? '$0.00' : signedMoney(row.dailyPnl)}
                          </td>
                          <td className="border border-[#999] py-1 px-2 text-right">{row.totalEarnings == null ? '$0.00' : money(row.totalEarnings)}</td>
                          <td className="border border-[#999] py-1 px-2 text-right font-bold">{row.endBalance == null ? money(row.initialBalance) : money(row.endBalance)}</td>
                          <td className={`border border-[#999] py-1 px-2 text-right font-bold ${row.vsRoadMap == null ? 'text-[#999]' : row.vsRoadMap >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.vsRoadMap == null ? '—' : signedMoney(row.vsRoadMap)}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="mt-5 bg-[#0D0D1A] text-white rounded-2xl p-5">
            <p className="font-black text-sm mb-1">Important:</p>
            <p className="text-sm text-white/75">
              This is a discipline and visualization tool, not a profit guarantee. Members should lower the daily target if the target makes them chase, oversize, or violate CKSR risk rules.
            </p>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
