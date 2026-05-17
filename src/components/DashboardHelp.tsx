'use client'

import { useState } from 'react'
import HelpModal from './HelpModal'

const SECTIONS = [
  { label: 'Total P&L', desc: 'Your cumulative profit and loss across all logged trades.' },
  { label: 'Win Rate', desc: 'Percentage of trades that closed positive. Aim for 60%+.' },
  { label: 'Total Trades', desc: 'All trades logged in your journal.' },
  { label: 'Current Streak', desc: 'Your active winning or losing streak.' },
  { label: 'Equity Curve', desc: 'Visual of your account growth over time. Rising = consistent. Choppy = review your setups.' },
]

const TIP = 'Log every trade — wins AND losses. The data only works if it\'s complete.'

export default function DashboardHelp() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full border border-[#0D0D1A] text-[#0D0D1A] text-sm font-bold hover:bg-[#0D0D1A] hover:text-white transition-colors flex items-center justify-center"
        aria-label="Help"
      >
        ?
      </button>
      <HelpModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Understanding Your Dashboard"
        sections={SECTIONS}
        tip={TIP}
      />
    </>
  )
}
