'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * A line that says what is happening while the form it sits in runs, for the
 * slow ones (Claude reading a photo, Opus putting looks together). Announced,
 * and gone once the action returns.
 */
export function Pending({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <p role="status" aria-live="polite" className="text-sm text-ink-3 empty:hidden">
      {pending ? children : null}
    </p>
  )
}
