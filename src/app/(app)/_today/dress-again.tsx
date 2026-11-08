'use client'

import { useActionState } from 'react'

import { dressAgain } from '@/app/actions/day'
import { FormMessage, SubmitButton, withEcho } from '@/components/ui/form'

/**
 * A new outfit for the day, with what is on. One line and a button, no fold:
 * the section above it already asks the question.
 */
export function DressAgain({ when, open = false }: { when: 'today' | 'tomorrow'; open?: boolean }) {
  const [state, action] = useActionState(dressAgain, null)
  const v = withEcho({ day_note: '' }, state?.values)

  return (
    <form action={action} key={state?.values ? JSON.stringify(state.values) : 'blank'}>
      <label htmlFor="day_note" className="sr-only">
        What is on {when}?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="day_note"
          name="day_note"
          type="text"
          defaultValue={v.day_note}
          placeholder={`Dinner out ${when === 'today' ? 'tonight' : 'tomorrow night'}`}
          autoComplete="off"
          className="input sm:flex-1"
        />
        <SubmitButton pending="Starting" variant={open ? 'primary' : 'quiet'}>
          {open ? 'Try again' : 'Dress me again'}
        </SubmitButton>
      </div>
      <div className="mt-2">
        <FormMessage message={state?.message} />
      </div>
    </form>
  )
}

/** The same new outfit, where a training day's gym fit is missing. */
export function DressForGym() {
  const [state, action] = useActionState(dressAgain, null)
  return (
    <form action={action} className="mt-5 space-y-3">
      <SubmitButton pending="Starting" variant="quiet" size="small">
        Dress me again
      </SubmitButton>
      <FormMessage message={state?.message} />
    </form>
  )
}
