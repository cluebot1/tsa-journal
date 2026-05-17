'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Trade {
  date: string
  pnl: number | null
}

interface EquityChartProps {
  trades: Trade[]
}

interface ChartDataPoint {
  date: string
  cumPnl: number
  rawDate: string
}

interface TooltipPayload {
  value: number
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const value = payload[0].value
    const isPositive = value >= 0
    return (
      <div className="bg-[#0D0D1A] text-white rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="text-white/60 mb-1">{label}</p>
        <p className={`font-semibold ${isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
          {isPositive ? '+' : ''}${value.toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

export default function EquityChart({ trades }: EquityChartProps) {
  // Sort trades by date ascending and compute cumulative P&L
  const sorted = [...trades]
    .filter((t) => t.date && t.pnl !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const chartData: ChartDataPoint[] = []
  let running = 0

  for (const trade of sorted) {
    running += trade.pnl ?? 0
    const d = new Date(trade.date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const label = `${month}/${day}`
    chartData.push({
      rawDate: trade.date,
      date: label,
      cumPnl: parseFloat(running.toFixed(2)),
    })
  }

  const isEmpty = chartData.length === 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-6">
      <h2 className="text-base font-semibold text-[#0D0D1A] mb-4">Equity Curve</h2>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <div className="w-12 h-12 rounded-full bg-[#EDE8DF] flex items-center justify-center mb-3">
            <svg
              width="22"
              height="22"
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
          <p className="text-sm text-[#0D0D1A]/50 max-w-[200px]">
            No trades yet. Start logging to see your curve.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E2DDD6" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#0D0D1A', opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(0)}`}
              width={58}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="cumPnl"
              stroke="#0D0D1A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#0D0D1A', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
