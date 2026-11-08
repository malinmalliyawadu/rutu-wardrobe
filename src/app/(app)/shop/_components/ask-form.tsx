'use client'

import { useActionState, type ReactNode } from 'react'

import { SubmitButton, withEcho } from '@/components/ui/form'
import { SearchIcon } from '@/components/ui/icons'

import { search } from '../ask/actions.ts'

/**
 * One line for what she is after, said the way she would to a shop
 * assistant. A search field, so the phone's keyboard says "search". Used at
 * the top of New and on the Ask page; `id` keeps the two apart, since a page
 * visited before stays in the DOM, hidden.
 */
export function AskForm({
  id,
  hint,
  label,
  aside,
  primary = false,
}: {
  id: string
  hint?: string
  label: string
  /** A link at the end of the label's line. */
  aside?: ReactNode
  primary?: boolean
}) {
  const [state, action] = useActionState(search, null)
  const v = withEcho({ request: '' }, state?.values)
  const error = state?.errors?.request
  const field = `${id}-request`
  return (
    <form action={action} role="search" className="max-w-2xl" key={state?.values ? JSON.stringify(state.values) : 'blank'}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={field} className="field-label">
          {label}
        </label>
        {aside}
      </div>
      <div className="flex gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
          <input
            id={field}
            name="request"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={200}
            defaultValue={v.request ?? ''}
            placeholder="A camel coat under $400"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${field}-error` : hint ? `${field}-hint` : undefined}
            className="input pl-11"
          />
        </div>
        <SubmitButton pending="Asking" variant={primary ? 'primary' : 'quiet'} className="shrink-0 px-4 sm:px-[1.375rem]">
          <span>Ask<span className="max-sm:sr-only"> the shops</span></span>
        </SubmitButton>
      </div>
      {error ? (
        <p id={`${field}-error`} role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${field}-hint`} className="prose-measure mt-2 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </form>
  )
}
