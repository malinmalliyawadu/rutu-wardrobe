'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/form'

/*
 * A picture of her still being made, in the arch it will fill. It asks for
 * the status every few seconds, as "See it on me" does; once ready, the page
 * re-renders with the picture. A failure stays here in words, since a failed
 * request has no picture and the next render leaves it out.
 */

const POLL_MS = 3000

export function Making({ id, className = '', compact = false }: { id: number; className?: string; compact?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/photos/try-ons/${id}/status`, { cache: 'no-store' })
        if (stopped) return
        if (response.status === 404) {
          // Deleted with her photos meanwhile.
          clearInterval(timer)
          router.refresh()
          return
        }
        if (!response.ok) return
        const next = (await response.json()) as { status: string; error: string | null }
        if (stopped || next.status === 'making') return
        clearInterval(timer)
        if (next.status === 'ready') router.refresh()
        else setError(next.error ?? 'It could not be made this time.')
      } catch {
        // Offline for a moment; the next tick tries again.
      }
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [id, router])

  return (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-arch)] bg-surface px-[12%] pt-[18%] text-center ${className}`}
    >
      {error ? (
        <>
          <p className="font-semibold text-alert">Not made</p>
          <p className="text-sm leading-snug text-ink-2">{error}</p>
        </>
      ) : (
        <>
          <Spinner className="size-5 text-accent" />
          <p className={`font-semibold text-ink-2 ${compact ? 'text-sm' : ''}`}>Putting it on you</p>
          {compact ? null : <p className="text-sm leading-snug text-ink-3">About a minute. It carries on if you leave.</p>}
        </>
      )}
    </div>
  )
}
