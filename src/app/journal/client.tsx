'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import NavBar from '@/components/NavBar'
import MobileNav from '@/components/MobileNav'
import HelpModal from '@/components/HelpModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
type Mood = 'confident' | 'neutral' | 'anxious' | 'frustrated'
interface JournalEntry {
  id: string
  user_id: string
  date: string
  title: string | null
  content: string
  mood: Mood | null
  created_at: string
}
const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'confident', label: 'Confident 🟢' },
  { value: 'neutral', label: 'Neutral 🟡' },
  { value: 'anxious', label: 'Anxious 🟠' },
  { value: 'frustrated', label: 'Frustrated 🔴' },
]
const MOOD_BADGE_STYLES: Record<Mood, string> = {
  confident: 'bg-green-100 text-green-700',
  neutral: 'bg-yellow-100 text-yellow-700',
  anxious: 'bg-orange-100 text-orange-700',
  frustrated: 'bg-red-100 text-red-700',
}
const inputClass =
  'border border-[#E2DDD6] rounded-xl px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#0D0D1A]/20 text-[#0D0D1A] placeholder:text-gray-400 text-sm'
function today(): string {
  return new Date().toISOString().split('T')[0]
}
function formatEntryDate(dateStr: string): string {
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}
export default function JournalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [userId, setUserId] = useState<string | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Form state
  const [formDate, setFormDate] = useState(today())
  const [formTitle, setFormTitle] = useState('')
  const [formMood, setFormMood] = useState<Mood | ''>('')
  const [formContent, setFormContent] = useState('')
  const fetchEntries = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })
    if (error) {
      toast.error('Failed to load journal entries.')
      return
    }
    setEntries(data ?? [])
  }, [supabase])
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email)
      setUserId(user.id)
      await fetchEntries(user.id)
      setLoading(false)
    }
    init()
  }, [])
  function openNewDialog() {
    setEditingEntry(null)
    setFormDate(today())
    setFormTitle('')
    setFormMood('')
    setFormContent('')
    setShowDialog(true)
  }
  function openEditDialog(entry: JournalEntry) {
    setEditingEntry(entry)
    setFormDate(entry.date)
    setFormTitle(entry.title ?? '')
    setFormMood(entry.mood ?? '')
    setFormContent(entry.content)
    setShowDialog(true)
  }
  function closeDialog() {
    setShowDialog(false)
    setEditingEntry(null)
  }
  async function handleSave() {
    if (!formContent.trim()) {
      toast.error('Journal content is required.')
      return
    }
    if (!userId) return
    setSaving(true)
    try {
      const payload = {
        date: formDate,
        title: formTitle.trim() || null,
        mood: formMood || null,
        content: formContent.trim(),
      }
      if (editingEntry) {
        const { error } = await supabase
          .from('journal_entries')
          .update(payload)
          .eq('id', editingEntry.id)
        if (error) throw error
        toast.success('Entry updated!')
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .insert({ ...payload, user_id: userId })
        if (error) throw error
        toast.success('Entry saved!')
      }
      closeDialog()
      await fetchEntries(userId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save entry.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }
  async function handleDelete() {
    if (!editingEntry || !userId) return
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', editingEntry.id)
      if (error) throw error
      toast.success('Entry deleted.')
      closeDialog()
      await fetchEntries(userId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete entry.'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }
  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <NavBar userEmail={userEmail} />
      <main className="max-w-4xl mx-auto pt-20 pb-20 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0D0D1A]">Trading Journal</h1>
              <button
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full border border-[#0D0D1A] text-[#0D0D1A] text-sm font-bold hover:bg-[#0D0D1A] hover:text-white transition-colors flex items-center justify-center"
                aria-label="Help"
              >
                ?
              </button>
            </div>
            <p className="text-sm text-[#0D0D1A]/50 mt-0.5">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <button
            onClick={openNewDialog}
            className="bg-[#0D0D1A] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + New Entry
          </button>
        </div>
        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E2DDD6] p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-3 bg-gray-200 rounded w-24" />
                  <div className="h-5 bg-gray-200 rounded w-16" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#0D0D1A]/40 text-base mb-2">No journal entries yet.</p>
            <p className="text-[#0D0D1A]/30 text-sm">Reflect on your trades.</p>
            <button
              onClick={openNewDialog}
              className="mt-6 bg-[#0D0D1A] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Write your first entry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl shadow-sm border border-[#E2DDD6] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Date + Mood */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs text-[#0D0D1A]/40 font-medium">
                        {formatEntryDate(entry.date)}
                      </span>
                      {entry.mood && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${MOOD_BADGE_STYLES[entry.mood]}`}
                        >
                          {MOOD_OPTIONS.find((m) => m.value === entry.mood)?.label ?? entry.mood}
                        </span>
                      )}
                    </div>
                    {/* Title */}
                    <h3 className="text-sm font-semibold text-[#0D0D1A] mb-1">
                      {entry.title || 'Untitled'}
                    </h3>
                    {/* Content preview */}
                    <p className="text-sm text-[#0D0D1A]/60 leading-relaxed line-clamp-3">
                      {entry.content.slice(0, 150)}
                      {entry.content.length > 150 ? '...' : ''}
                    </p>
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={() => openEditDialog(entry)}
                    className="text-xs text-[#0D0D1A]/50 hover:text-[#0D0D1A] border border-[#E2DDD6] rounded-lg px-3 py-1.5 hover:bg-[#EDE8DF] transition-colors shrink-0"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <MobileNav />

      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Your Trade Journal"
        sections={[
          { label: 'Standalone Entries', desc: 'Write session recaps, mindset notes, or lessons not tied to a specific trade.' },
          { label: 'Mood Tracking', desc: 'Log how you felt going into the session overall, not just per trade.' },
          { label: 'Date Timeline', desc: 'Review your mental progression week over week and spot emotional patterns.' },
        ]}
        tip="Write a brief entry after every session — good or bad. Note market conditions and how you felt."
      />

      {/* New / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Entry' : 'New Journal Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-[#0D0D1A]/60 mb-1 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={inputClass}
              />
            </div>
            {/* Title (optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#0D0D1A]/60 mb-1 uppercase tracking-wide">
                Title <span className="normal-case font-normal text-[#0D0D1A]/30">(optional)</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Strong gap and go day"
                className={inputClass}
              />
            </div>
            {/* Mood */}
            <div>
              <label className="block text-xs font-semibold text-[#0D0D1A]/60 mb-1 uppercase tracking-wide">
                Mood
              </label>
              <select
                value={formMood}
                onChange={(e) => setFormMood(e.target.value as Mood | '')}
                className={inputClass}
              >
                <option value="">Select mood...</option>
                {MOOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-[#0D0D1A]/60 mb-1 uppercase tracking-wide">
                Reflection <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="What happened today? What did you learn? How did you manage risk?"
                rows={5}
                className="min-h-[120px] resize-y"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 justify-between">
            {/* Delete button (edit mode only) */}
            {editingEntry && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="mr-auto"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={closeDialog}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || deleting}
                className="bg-[#0D0D1A] text-white hover:opacity-90"
              >
                {saving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Save Entry'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
