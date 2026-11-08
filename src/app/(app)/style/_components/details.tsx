'use client'

import { useState, type ReactNode } from 'react'

/**
 * A form kept out of the way until she asks for it, opening in place with a
 * crossfade. Once open it stays open, so a failed save keeps her place.
 */
export function Details({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)} aria-expanded={false}>
        {title}
      </button>
    )
  }
  return (
    <section className="crossfade" aria-label={title}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="headline">{title}</h2>
        <button type="button" className="link text-sm" onClick={() => setOpen(false)} aria-expanded>
          Close
        </button>
      </div>
      {line ? <p className="mt-2 mb-8 text-sm text-ink-3">{line}</p> : <div className="mb-8" />}
      {children}
    </section>
  )
}
