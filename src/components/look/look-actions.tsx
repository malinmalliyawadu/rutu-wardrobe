'use client'

import { useOptimistic, useState, useTransition } from 'react'

import { lookAction } from '@/app/actions/look'
import type { Look, LookAction } from '@/lib/looks'

import { CheckIcon, HeartIcon } from '../ui/icons.tsx'

type Shown = { saved: boolean; woreToday: boolean }

/**
 * Wear this and Save. Both show at once and are saved behind; a failure says
 * so under them. "Wear this" is the screen's one solid button, and once worn
 * it steps back to quiet and says so.
 */
export function LookActions({
  look,
  today,
  canWear = true,
}: {
  look: Look
  /** Today in New Zealand, YYYY-MM-DD. */
  today: string
  /** False when the look is for tomorrow: nothing to log as worn yet. */
  canWear?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useOptimistic<Shown>({ saved: look.status === 'saved', woreToday: look.worn[0] === today })
  const [, startTransition] = useTransition()

  function send(input: LookAction, next: Shown) {
    setFailed(false)
    startTransition(async () => {
      setShown(next)
      const result = await lookAction(input)
      if (!result.ok) setFailed(true)
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {canWear ? (
          <button
            type="button"
            aria-pressed={shown.woreToday}
            className={`btn ${shown.woreToday ? 'btn-quiet' : 'btn-primary'} min-w-36`}
            onClick={() =>
              send(
                { action: shown.woreToday ? 'unwore' : 'wore', look_id: look.id },
                { saved: shown.woreToday ? shown.saved : true, woreToday: !shown.woreToday },
              )
            }
          >
            {shown.woreToday ? <CheckIcon className="size-5" /> : null}
            {shown.woreToday ? 'Wearing it' : 'Wear this'}
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={shown.saved}
          aria-label={shown.saved ? 'Saved to your looks' : 'Save to your looks'}
          className="btn btn-quiet"
          onClick={() => send({ action: shown.saved ? 'unsave' : 'save', look_id: look.id }, { ...shown, saved: !shown.saved })}
        >
          <HeartIcon filled={shown.saved} className={`size-5 ${shown.saved ? 'text-accent' : ''}`} />
          {shown.saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          That did not save. Try again.
        </p>
      ) : null}
    </div>
  )
}
