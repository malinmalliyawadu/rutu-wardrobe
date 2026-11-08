'use client'

import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

/** Matches the 1.6s fill in globals.css (.hold-fill). */
const HOLD_MS = 1600

/**
 * Hold to confirm, for destructive and rare actions. The press is slow and the
 * fill is a real progress bar; release before the end and it snaps back.
 * Keyboard users get a confirm dialog instead of a timed press. Hidden inputs
 * (an id, say) go in through `fields`.
 */
export function HoldButton({
  action,
  label,
  pendingLabel,
  fields,
}: {
  action: (form: FormData) => void | Promise<void>
  label: string
  pendingLabel: string
  fields?: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<number | null>(null)
  const [done, setDone] = useState(false)

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (done || timer.current !== null) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic or already-released pointer: the hold still works, it just
      // cancels if the pointer leaves the button.
    }
    timer.current = window.setTimeout(() => {
      timer.current = null
      setDone(true)
      formRef.current?.requestSubmit()
    }, HOLD_MS)
  }

  function cancel() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  return (
    <form ref={formRef} action={action}>
      {fields}
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !done) {
            event.preventDefault()
            if (window.confirm(`${label}?`)) {
              setDone(true)
              formRef.current?.requestSubmit()
            }
          }
        }}
        aria-busy={done || undefined}
        aria-label={`${label} (hold to confirm)`}
        className="hold btn btn-quiet relative select-none overflow-hidden text-alert"
      >
        <span aria-hidden className="hold-fill absolute inset-0 bg-alert/15" />
        <span className="relative">{done ? pendingLabel : label}</span>
      </button>
    </form>
  )
}
