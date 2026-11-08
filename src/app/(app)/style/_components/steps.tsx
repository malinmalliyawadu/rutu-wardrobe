'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Field, FormMessage, SubmitButton, TextArea } from '@/components/ui/form'

import { generateGuide } from '../palette/actions'
import { draftPlan, refillSlot } from '../plan/actions'

/*
 * The long Claude calls: drafting the guide, drafting the plan, refilling a
 * retired piece. Each says how long it takes while it runs, so a minute of
 * waiting is expected rather than worrying.
 */

/** Shown only while its form's action runs. */
function Waiting({ children }: { children: string }) {
  const { pending } = useFormStatus()
  return pending ? <p className="crossfade text-sm text-ink-3">{children}</p> : null
}

export function GuideStep({ again = false }: { again?: boolean }) {
  const [state, action] = useActionState(generateGuide, null)
  return (
    <form action={action} className="space-y-3">
      <SubmitButton pending="Drafting your palette" variant={again ? 'quiet' : 'primary'}>
        {again ? 'Draft it again' : 'Draft my palette'}
      </SubmitButton>
      <Waiting>Opus is reading your colouring and proportions. It takes a minute or two; keep this page open.</Waiting>
      <FormMessage message={state?.message} />
    </form>
  )
}

/**
 * The first draft is the screen's one action, so it is primary; a redraft
 * sits after the plan, quiet, with a note.
 */
export function DraftForm({ replaces, first }: { replaces: number; first: boolean }) {
  const [state, action] = useActionState(draftPlan, null)
  return (
    <form action={action} className="space-y-4">
      {first ? null : (
        <Field
          label="What should change"
          name="note"
          hint={`If you like. Pieces you added, edited, own or have in mind stay; the other ${replaces} are drafted again.`}
        >
          <TextArea name="note" defaultValue={state?.values?.note} rows={3} placeholder="Fewer knits, more for work" />
        </Field>
      )}
      <SubmitButton pending="Drafting your plan" variant={first ? 'primary' : 'quiet'}>
        {first ? 'Draft my plan' : 'Draft it again'}
      </SubmitButton>
      <Waiting>Opus is working through your profile and palette. Allow two or three minutes.</Waiting>
      <FormMessage message={state?.message} />
    </form>
  )
}

/** Claude proposes what takes a retired piece's place. */
export function RefillForm({ id, compact = false }: { id: number; compact?: boolean }) {
  const [state, action] = useActionState(refillSlot, null)
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {compact ? null : (
        <Field label="Anything it should know" name="note" hint="If you like: why this one went, or what you want instead.">
          <TextArea name="note" defaultValue={state?.values?.note} rows={2} />
        </Field>
      )}
      <SubmitButton pending="Finding its replacement" variant="quiet" size={compact ? 'small' : 'normal'}>
        Refill
      </SubmitButton>
      <Waiting>About a minute.</Waiting>
      <FormMessage message={state?.message} />
    </form>
  )
}
