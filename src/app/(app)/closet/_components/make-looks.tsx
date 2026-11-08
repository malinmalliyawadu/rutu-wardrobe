'use client'

import { useActionState, useState } from 'react'

import { FormMessage, SubmitButton, withEcho } from '@/components/ui/form'
import type { LookKind } from '@/lib/looks'

import { makeLooks } from '../actions.ts'
import { Pending } from './pending.tsx'

const KIND_LABELS: Record<LookKind, string> = { week: 'For your week', gym: 'Gym fits' }

/**
 * Six new looks on a tap, with an optional word on what they are for. When
 * her gym kit makes a gym fit, she chooses between a set for her week (with a
 * gym fit or two in it, if she trains) and a set of gym fits only.
 */
export function MakeLooks({ first, kinds }: { first: boolean; kinds: LookKind[] }) {
  const [state, action] = useActionState(makeLooks, null)
  const v = withEcho({ note: '', kind: kinds[0] ?? 'week' }, state?.values)
  const [kind, setKind] = useState(v.kind)
  const gym = kind === 'gym'
  return (
    <form action={action} className="max-w-2xl space-y-5" key={state?.values ? JSON.stringify(state.values) : 'blank'}>
      {kinds.length > 1 ? (
        <div role="radiogroup" aria-label="What kind of looks" className="flex flex-wrap gap-2">
          {kinds.map((option) => (
            <label key={option} className="chip">
              <input type="radio" name="kind" value={option} defaultChecked={v.kind === option} onChange={() => setKind(option)} />
              {KIND_LABELS[option]}
            </label>
          ))}
        </div>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}
      <div>
        <label htmlFor="looks-note" className="sr-only">
          Anything in mind?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="looks-note"
            name="note"
            type="text"
            defaultValue={v.note}
            maxLength={300}
            autoComplete="off"
            placeholder={gym ? 'Anything in mind? Leg day, a cold morning session' : 'Anything in mind? A wedding on Saturday, more colour'}
            className="input sm:flex-1"
          />
          <SubmitButton pending="Putting looks together">
            {gym ? 'Make gym fits' : first ? 'Make my first looks' : 'Make new looks'}
          </SubmitButton>
        </div>
        <div className="mt-2 space-y-1">
          <Pending>
            {gym ? 'Opus is putting gym fits together from your kit.' : 'Opus is putting six looks together from your pieces.'} A minute or
            two.
          </Pending>
          <FormMessage message={state?.message} />
        </div>
      </div>
    </form>
  )
}
