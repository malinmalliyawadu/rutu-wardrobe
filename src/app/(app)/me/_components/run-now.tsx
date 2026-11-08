'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'

import { FormMessage, Spinner, SubmitButton } from '@/components/ui/form'
import type { LiveRun } from '@/lib/finder/runs'

import { runFinderNow, type RunNowState } from '../actions'

/*
 * Start the finder without waiting for the night. While a run is on, the
 * button gives way to what it is doing, asked of /api/finder/run every few
 * seconds; when it ends, the page is refreshed once so the last run's numbers
 * and the shops' counts are the new ones.
 */

const POLL_MS = 4000

/** The route sends dates as strings. */
function revive(raw: LiveRun): LiveRun {
  return { ...raw, started_at: new Date(raw.started_at) }
}

export function RunNow({ run: initial }: { run: LiveRun | null }) {
  const router = useRouter()
  const [state, action] = useActionState(runFinderNow, null)
  const [run, setRun] = useState(initial)

  // The server's answer wins whenever it names a different run (a refresh
  // after starting one, or after one ends).
  const [seen, setSeen] = useState(initial?.id ?? null)
  if ((initial?.id ?? null) !== seen) {
    setSeen(initial?.id ?? null)
    setRun(initial)
  }

  // A refusal ("a run is already going") is answered by showing that run, so
  // once a run has been on screen, the refusal has said its piece.
  const [answered, setAnswered] = useState<RunNowState>(null)
  if (run && answered !== state) setAnswered(state)

  const runId = run?.id ?? null
  useEffect(() => {
    if (runId === null) return
    let stopped = false
    const timer = setInterval(async () => {
      try {
        const response = await fetch('/api/finder/run', { cache: 'no-store' })
        if (!response.ok || stopped) return
        const body = (await response.json()) as { run: LiveRun | null }
        if (stopped) return
        if (body.run?.id === runId) {
          setRun(revive(body.run))
        } else {
          setRun(body.run ? revive(body.run) : null)
          router.refresh()
        }
      } catch {
        // Offline for a moment; the next tick tries again.
      }
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [runId, router])

  if (run) return <Running run={run} />

  return (
    <form action={action} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="title">It runs on its own each night</p>
        <p className="mt-0.5 text-sm text-ink-2">A run now may spend up to the nightly limits again.</p>
        {state && !state.ok && state !== answered ? (
          <div className="mt-2">
            <FormMessage message={state.message} />
          </div>
        ) : null}
      </div>
      <SubmitButton variant="quiet" pending="Starting" className="shrink-0 self-start sm:self-center">
        Run now
      </SubmitButton>
    </form>
  )
}

function Running({ run }: { run: LiveRun }) {
  const time = run.started_at.toLocaleTimeString('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Pacific/Auckland',
  })
  const detail =
    run.stage === 'reading'
      ? 'Reading the shops and sorting out what fits you, a few minutes.'
      : run.judged === 0
        ? 'Judging what is new, the most important pieces of your plan first. New finds reach Shop as they come.'
        : `Judging: ${run.judged.toLocaleString('en-NZ')} so far, US$${run.usd.toFixed(2)}. New finds reach Shop as they come.`
  return (
    <div role="status" aria-live="polite" className="card p-5 sm:p-6">
      <p className="title flex items-center gap-2">
        <Spinner />
        Running since {time}
      </p>
      <p className="tabular mt-0.5 text-sm text-ink-2">{detail}</p>
    </div>
  )
}
