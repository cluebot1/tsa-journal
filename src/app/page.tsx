import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="font-sans min-h-screen bg-[#EDE8DF]">
      {/* Top Nav */}
      <nav className="w-full flex items-center justify-between px-6 py-4 bg-[#EDE8DF]">
        <span className="text-[#0D0D1A] font-bold text-lg tracking-tight">
          TSA Journal
        </span>
        <Link
          href="/login"
          className="text-[#0D0D1A] text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="w-full px-6 pt-20 pb-24 flex flex-col items-center text-center bg-[#EDE8DF]">
        {/* Pill label */}
        <span className="bg-[#0D0D1A] text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest mb-8 inline-block">
          The System. Tracked.
        </span>

        {/* H1 */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#0D0D1A] leading-tight max-w-4xl mb-6">
          Your Trading Journal.
          <br />
          Built for The System.
        </h1>

        {/* Subtext */}
        <p className="text-[#6B6B6B] text-lg md:text-xl max-w-xl mb-10">
          Track every trade. Master the CKSR framework. See your edge unfold.
        </p>

        {/* CTA Button */}
        <Link
          href="/signup"
          className="bg-[#0D0D1A] text-white px-8 py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity mb-12 inline-block"
        >
          Create Your Account →
        </Link>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {['400+ Members', '5 Setups', 'Built for Options'].map((stat) => (
            <span
              key={stat}
              className="bg-[#0D0D1A] text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest"
            >
              {stat}
            </span>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-white px-6 py-20">
        <div className="max-w-5xl mx-auto">
          {/* Section label */}
          <div className="flex justify-center mb-12">
            <span className="bg-[#0D0D1A] text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest">
              Everything You Need
            </span>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              {
                icon: '📋',
                title: 'Trade Logging',
                description:
                  'Log every entry with full CKSR detail, price, contracts, and P&L.',
              },
              {
                icon: '📈',
                title: 'Equity Curve',
                description:
                  'Visualize your cumulative P&L over time and spot your edge.',
              },
              {
                icon: '🏷️',
                title: 'CKSR Tagging',
                description:
                  'Catalyst, Key Level, Strat Setup, Risk — structured every time.',
              },
              {
                icon: '📝',
                title: 'Journal Notes',
                description:
                  'Write your mindset, thesis, and lessons after every trade.',
              },
              {
                icon: '🖼️',
                title: 'Screenshot Upload',
                description:
                  'Attach chart screenshots via URL to review your setups.',
              },
              {
                icon: '📊',
                title: 'Analytics by Setup',
                description:
                  'Win rate, P&L, and performance broken down by setup type.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2DDD6] flex flex-col gap-3"
              >
                <div className="text-2xl">{feature.icon}</div>
                <h3 className="font-bold text-[#0D0D1A] text-base">
                  {feature.title}
                </h3>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="w-full bg-[#0D0D1A] px-6 py-20 flex flex-col items-center text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Ready to track your edge?
        </h2>
        <Link
          href="/signup"
          className="bg-white text-[#0D0D1A] px-8 py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity inline-block"
        >
          Create Your Account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#EDE8DF] px-6 py-10 text-center flex flex-col gap-2">
        <p className="text-[#0D0D1A] font-semibold text-sm">
          The School of Threaded Arts
        </p>
        <p className="text-[#6B6B6B] text-xs">
          TSA Trade Journal — For TSA members only. Invite code required.
        </p>
        <p className="text-[#6B6B6B] text-xs">
          © {new Date().getFullYear()} The School of Threaded Arts. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
