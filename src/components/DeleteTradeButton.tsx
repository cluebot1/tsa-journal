'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DeleteTradeButtonProps {
  tradeId: string
}

export default function DeleteTradeButton({ tradeId }: DeleteTradeButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Delete this trade? This action cannot be undone.')) return

    setDeleting(true)

    try {
      const response = await fetch('/api/trades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [tradeId] }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete trade.')
      }

      toast.success('Trade deleted.')
      router.push('/trades')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete trade.'
      toast.error(message)
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={deleting}
      className="border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
    >
      {deleting ? 'Deleting...' : 'Delete Trade'}
    </Button>
  )
}
