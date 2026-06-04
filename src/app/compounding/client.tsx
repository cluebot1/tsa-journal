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
  balance: number
}

interface AccountabilityRow {
  day: number
  week: number
  initialBalance: number
  dailyPnl: number | null
  endBalance: number | null
  vsRoadMap: number | null
}

interface Milestone {
  label: string
  target: number
  type: 'balance' | 'profit'
  emoji: string
  day: number | null
  achieved: boolean
  progress: number
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

function milestoneProgress(current: number, start: number, target: number, type: 'balance' | 'profit'): number {
  if (type === 'profit') return Math.min(Math.max(((current - start) / target) * 100, 0), 100)
  if (target <= start) return current >= target ? 100 : 0
  return Math.min(Math.max(((current - start) / (target - start)) * 100, 0), 100)
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
  const defaultBalance = initialStartingBalance != null ? String(initialStartingBalance) : '3330'
  const [roadMapStartingBalance, setRoadMapStartingBalance] = useState(defaultBalance)
  const [actualStartingBalance, setActualStartingBalance] = useState(defaultBalance)
  const [dailyTarget, setDailyTarget] = useState('2')
  const [weeks, setWeeks] = useState('52')

  const data = useMemo(() => {
    const roadStart = Math.max(Number(roadMapStartingBalance) || 0, 0)
    const actualStart = Math.max(Number(actualStartingBalance) || 0, 0)
    const rate = Math.max(Number(dailyTarget) || 0, 0) / 100
    const weekCount = Math.min(Math.max(Number(weeks) || 1, 1), 52)
    const dayCount = weekCount * 5

    let roadBalance = roadStart
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

    let actualBalance = actualStart
    const accountabilityRows: AccountabilityRow[] = []
    for (let day = 1; day <= dayCount; day++) {
      const initialBalance = actualBalance
      const dailyPnl = actualPnls[day - 1] ?? null
      let endBalance: number | null = null
      let vsRoadMap: number | null = null

      if (dailyPnl != null) {
        actualBalance += dailyPnl
        endBalance = actualBalance
        vsRoadMap = endBalance - roadRows[day - 1].balance
      }

      accountabilityRows.push({
        day,
        week: Math.ceil(day / 5),
        initialBalance,
        dailyPnl,
        endBalance,
        vsRoadMap,
      })
    }

    const finalRoadBalance = roadRows[roadRows.length - 1]?.balance ?? roadStart
    const completedRows = accountabilityRows.filter((row) => row.endBalance != null)
    const latestActual = completedRows.length ? completedRows[completedRows.length - 1].endBalance! : actualStart
    const latestRoad = completedRows.length ? roadRows[completedRows.length - 1].balance : roadStart
    const actualBalances = completedRows.map((row) => row.endBalance!)

    const rawMilestones = [
      { label: 'First +$100', target: 100, type: 'profit' as const, emoji: '🌱' },
      { label: 'First +$500', target: 500, type: 'profit' as const, emoji: '🔥' },
      { label: 'First +$1K', target: 1000, type: 'profit' as const, emoji: '🏆' },
      { label: 'Account Doubled', target: actualStart * 2, type: 'balance' as const, emoji: '💎' },
      { label: '$5K Account', target: 5000, type: 'balance' as const, emoji: '🧱' },
      { label: '$10K Account', target: 10000, type: 'balance' as const, emoji: '🚀' },
      { label: '$25K Account', target: 25000, type: 'balance' as const, emoji: '👑' },
    ].filter((m) => (m.type === 'profit' ? m.target > 0 : m.target > actualStart))

    const milestones: Milestone[] = rawMilestones.map((m) => {
      const achievedIndex = actualBalances.findIndex((balance) =>
        m.type === 'profit' ? balance - actualStart >= m.target : balance >= m.target
      )
      const roadIndex = roadRows.findIndex((row) =>
        m.type === 'profit' ? row.balance - roadStart >= m.target : row.balance >= m.target
      )
      return {
        ...m,
        day: achievedIndex >= 0 ? achievedIndex + 1 : roadIndex >= 0 ? roadIndex + 1 : null,
        achieved: achievedIndex >= 0,
        progress: milestoneProgress(latestActual, actualStart, m.target, m.type),
      }
    })

    const nextMilestone = milestones.find((m) => !m.achieved) ?? milestones[milestones.length - 1]

    return {
      roadStart,
      actualStart,
      rate,
      weekCount,
      dayCount,
      roadRows,
      accountabilityRows,
      finalRoadBalance,
      totalRoadProfit: finalRoadBalance - roadStart,
      completedDays: completedRows.length,
      latestActual,
      latestRoad,
      actualVsRoad: latestActual - latestRoad,
      milestones,
      nextMilestone,
    }
  }, [roadMapStartingBalance, actualStartingBalance, dailyTarget, weeks, trades])

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white border border-[#D8D0C4] rounded-2xl p-3">
              <label className="text-[10px] font-black uppercase text-[#0D0D1A]/50">
                Road Map Start
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={roadMapStartingBalance}
                  onChange={(e) => setRoadMapStartingBalance(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D8D0C4] bg-[#F7F3ED] px-2 py-2 text-sm font-bold text-[#0D0D1A] outline-none focus:ring-2 focus:ring-[#0D0D1A]"
                />
              </label>
              <label className="text-[10px] font-black uppercase text-[#0D0D1A]/50">
                Actual Start
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={actualStartingBalance}
                  onChange={(e) => setActualStartingBalance(e.target.value)}
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
              <p className="text-lg font-black text-[#0D0D1A] mt-1">{money(data.roadStart)}</p>
              <p className="text-[11px] font-bold text-[#0D0D1A]/45 mt-1">Actual start: {money(data.actualStart)}</p>
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

          <div className="bg-white border-2 border-[#111] rounded-2xl p-4 mb-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0D0D1A]/45">Milestone Map</p>
                <h2 className="text-lg font-black text-[#0D0D1A]">Turn account growth into checkpoints.</h2>
              </div>
              {data.nextMilestone && (
                <div className="rounded-xl border border-[#D8D0C4] bg-[#F7F3ED] px-4 py-3 text-sm">
                  <span className="font-black">Next:</span> {data.nextMilestone.emoji} {data.nextMilestone.label}
                  {data.nextMilestone.day ? <span className="text-[#0D0D1A]/50"> · Road map day {data.nextMilestone.day}</span> : null}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.milestones.map((milestone) => (
                <div
                  key={milestone.label}
                  className={`rounded-xl border p-4 ${milestone.achieved ? 'bg-emerald-50 border-emerald-300' : 'bg-[#F7F3ED] border-[#D8D0C4]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl">{milestone.emoji}</p>
                      <h3 className="font-black text-[#0D0D1A] mt-1">{milestone.label}</h3>
                      <p className="text-xs text-[#0D0D1A]/55 mt-1">
                        {milestone.type === 'profit' ? `${money(milestone.target)} total profit` : `${money(milestone.target)} balance`}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase rounded-full px-2 py-1 ${milestone.achieved ? 'bg-emerald-600 text-white' : 'bg-white text-[#0D0D1A]/50 border border-[#D8D0C4]'}`}>
                      {milestone.achieved ? 'Unlocked' : milestone.day ? `Day ${milestone.day}` : 'Future'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white border border-[#D8D0C4] mt-4 overflow-hidden">
                    <div
                      className={milestone.achieved ? 'h-full bg-emerald-600' : 'h-full bg-[#0B4FD8]'}
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-[#0D0D1A]/55 mt-2">{pct(milestone.progress)} complete</p>
                </div>
              ))}
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
                <table className="w-full min-w-[460px] text-[10px] md:text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#F3F3F3] text-[#0D0D1A]">
                      <th className="border border-[#111] py-1 px-2 text-left">DAY</th>
                      <th className="border border-[#111] py-1 px-2 text-right">INITIAL BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">{pct(data.rate * 100)} GOAL</th>
                      <th className="border border-[#111] py-1 px-2 text-right">BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roadRows.map((row, index) => (
                      <Fragment key={`road-group-${row.day}`}>
                        {index % 5 === 0 && <WeekBreak week={row.week} columns={4} />}
                        <tr className="odd:bg-white even:bg-[#FAFAFA]">
                          <td className="border border-[#999] py-1 px-2 font-bold">{row.day}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.initialBalance)}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.goal)}</td>
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
                <table className="w-full min-w-[560px] text-[10px] md:text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#F3F3F3] text-[#0D0D1A]">
                      <th className="border border-[#111] py-1 px-2 text-left">DAY</th>
                      <th className="border border-[#111] py-1 px-2 text-right">INITIAL BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">DAILY P&amp;L</th>
                      <th className="border border-[#111] py-1 px-2 text-right">END BALANCE</th>
                      <th className="border border-[#111] py-1 px-2 text-right">VS MAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accountabilityRows.map((row, index) => (
                      <Fragment key={`actual-group-${row.day}`}>
                        {index % 5 === 0 && <WeekBreak week={row.week} columns={5} />}
                        <tr className="odd:bg-white even:bg-[#FAFAFA]">
                          <td className="border border-[#999] py-1 px-2 font-bold">{row.day}</td>
                          <td className="border border-[#999] py-1 px-2 text-right">{money(row.initialBalance)}</td>
                          <td className={`border border-[#999] py-1 px-2 text-right font-bold ${row.dailyPnl == null ? 'text-[#999]' : row.dailyPnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.dailyPnl == null ? '$0.00' : signedMoney(row.dailyPnl)}
                          </td>
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
