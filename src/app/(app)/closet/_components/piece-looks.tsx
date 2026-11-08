'use client'

import { useActionState } from 'react'

import { FormMessage, SubmitButton, withEcho } from '@/components/ui/form'

import { makePieceLooks } from '../actions.ts'
import { Pending } from './pending.tsx'

/**
 * Three looks that each wear this piece, on a tap, with an optional word on
 * what they are for. One line and a button, like Today's "Something on?";
 * the looks land under it when Opus is done.
 */
export function MakePieceLooks({ id, again, gym }: { id: number; again: boolean; gym: boolean }) {
  const [state, action] = useActionState(makePieceLooks, null)
  const v = withEcho({ note: '' }, state?.values)
  return (
    <form action={action} className="max-w-2xl" key={state?.values ? JSON.stringify(state.values) : 'blank'}>
      <input type="hidden" name="id" value={id} />
      <label htmlFor="piece-looks-note" className="sr-only">
        Anything in mind?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="piece-looks-note"
          name="note"
          type="text"
          defaultValue={v.note}
          maxLength={300}
          autoComplete="off"
          placeholder={gym ? 'Anything in mind? A cold morning run, leg day' : 'Anything in mind? The office, a wedding, a cold day'}
          className="input sm:flex-1"
        />
        <SubmitButton pending="Putting looks together" variant="quiet">
          {again ? 'Make new ones' : gym ? 'Make gym fits with it' : 'Make looks with it'}
        </SubmitButton>
      </div>
      <div className="mt-2 space-y-1">
        <Pending>Opus is putting three looks together around it. About a minute.</Pending>
        <FormMessage message={state?.message} />
      </div>
    </form>
  )
}
