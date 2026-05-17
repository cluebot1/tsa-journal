'use client'

interface Section {
  label: string
  desc: string
}

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  sections: Section[]
  tip: string
}

export default function HelpModal({ isOpen, onClose, title, sections, tip }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl p-6 pb-10 sm:pb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-[#0D0D1A]">{title}</h2>
            <button
              onClick={onClose}
              className="bg-[#EDE8DF] text-[#0D0D1A]/60 rounded-lg w-8 h-8 flex items-center justify-center hover:text-[#0D0D1A] transition-colors text-base leading-none"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 mb-5">
            {sections.map((s) => (
              <p key={s.label} className="text-sm text-[#0D0D1A] leading-relaxed">
                <span className="font-bold">{s.label}:</span>{' '}
                <span className="text-[#0D0D1A]/70">{s.desc}</span>
              </p>
            ))}
          </div>
          <div className="bg-[#EDE8DF] rounded-full px-4 py-2.5">
            <p className="text-xs italic text-[#0D0D1A]/60">
              💡 {tip}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
