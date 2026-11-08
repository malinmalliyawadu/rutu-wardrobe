'use client'

import { useState, type ReactNode } from 'react'

import type { OpenSlot } from '@/lib/pieces'

import { PieceForm } from './piece-form.tsx'
import type { PieceFormValues, Swatch } from './piece-values.ts'

/**
 * A piece's details as facts, with "Edit details" turning them into the form
 * in place (a short crossfade). Saving comes back to this page; the caller
 * keys this on when the piece was last edited, so it opens on the facts again.
 */
export function PieceDetails({
  children,
  id,
  initial,
  best,
  neutrals,
  slots,
}: {
  /** The facts, rendered on the server. */
  children: ReactNode
  id: number
  initial: PieceFormValues
  best: Swatch[]
  neutrals: Swatch[]
  slots: OpenSlot[]
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <div className="crossfade">
        <PieceForm
          id={id}
          initial={initial}
          best={best}
          neutrals={neutrals}
          slots={slots}
          submitLabel="Save the piece"
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }
  return (
    <div>
      {children}
      <button type="button" className="link mt-2" onClick={() => setEditing(true)}>
        Edit details
      </button>
    </div>
  )
}
