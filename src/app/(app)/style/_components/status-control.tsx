'use client'

import { useOptimistic, useTransition } from 'react'

import { SLOT_STATUSES, type SlotStatus } from '@/lib/wardrobe-values'

import { changeStatus } from '../plan/actions'
import { STATUS_HINTS, STATUS_WORDS } from './status-words'

/**
 * Where a piece stands, saved on tap without the rest of the page: it is
 * what changes most often here. The choice shows at once and is saved behind.
 */
export function StatusControl({ id, status }: { id: number; status: SlotStatus }) {
  const [shown, setShown] = useOptimistic(status)
  const [, startTransition] = useTransition()

  function choose(next: SlotStatus) {
    if (next === shown) return
    startTransition(async () => {
      setShown(next)
      const form = new FormData()
      form.set('id', String(id))
      form.set('status', next)
      await changeStatus(form)
    })
  }

  return (
    <div role="group" aria-labelledby="status-label">
      <p id="status-label" className="field-label">
        Where it stands
      </p>
      <div className="flex flex-wrap gap-2">
        {SLOT_STATUSES.map((value) => (
          <button key={value} type="button" aria-pressed={shown === value} onClick={() => choose(value)} className="chip">
            {STATUS_WORDS[value]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-3" aria-live="polite">
        {STATUS_HINTS[shown]}
      </p>
    </div>
  )
}
