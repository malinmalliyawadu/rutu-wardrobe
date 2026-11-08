'use client'

import { useActionState } from 'react'

import { Field, FormMessage, NumberInput, SubmitButton, withEcho } from '@/components/ui/form'
import type { FinderSettings, StoreCount } from '@/lib/finder/settings'

import { submitFinderSettings } from '../actions'

import { Group } from './group'

/*
 * What the finder may spend on Claude, in US dollars as Anthropic bills it,
 * and which shops it reads. One form, one save: the limits and the switches
 * go together.
 */

export function FinderForm({
  settings,
  stores,
  perScore,
}: {
  settings: FinderSettings
  stores: StoreCount[]
  /** Shops read only from her links, which have no switch and stay as they are. */
  perScore: number | null
}) {
  const [state, action] = useActionState(submitFinderSettings, null)
  const e = state?.errors ?? {}
  const v = withEcho(
    {
      max_usd_per_run: settings.max_usd_per_run,
      max_usd_statements: settings.max_usd_statements,
      max_usd_per_search: settings.max_usd_per_search,
      max_usd_per_month: settings.max_usd_per_month,
    },
    state?.values,
  )
  const on = new Set(
    state?.values
      ? (state.values.stores ?? '').split(',').filter(Boolean)
      : stores.filter((store) => store.enabled).map((store) => store.slug),
  )

  return (
    <form action={action} className="max-w-2xl">
      <Group title="What it may spend">
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
          <Field
            label="Finds, a night"
            name="max_usd_per_run"
            error={e.max_usd_per_run}
            hint={limitHint(settings.max_usd_per_run, perScore, 'judging')}
          >
            <NumberInput name="max_usd_per_run" defaultValue={v.max_usd_per_run} unit="US$" error={e.max_usd_per_run} />
          </Field>
          <Field
            label="Statement pieces, a night"
            name="max_usd_statements"
            error={e.max_usd_statements}
            hint={limitHint(settings.max_usd_statements, perScore, 'them')}
          >
            <NumberInput
              name="max_usd_statements"
              defaultValue={v.max_usd_statements}
              unit="US$"
              error={e.max_usd_statements}
            />
          </Field>
          <Field
            label="One ask of the shops"
            name="max_usd_per_search"
            error={e.max_usd_per_search}
            hint={limitHint(settings.max_usd_per_search, perScore, 'asking')}
          >
            <NumberInput
              name="max_usd_per_search"
              defaultValue={v.max_usd_per_search}
              unit="US$"
              error={e.max_usd_per_search}
            />
          </Field>
          <Field
            label="A month, all in"
            name="max_usd_per_month"
            error={e.max_usd_per_month}
            hint="Nights and asks together. Blank for no limit."
          >
            <NumberInput
              name="max_usd_per_month"
              defaultValue={v.max_usd_per_month}
              unit="US$"
              error={e.max_usd_per_month}
            />
          </Field>
        </div>
        {perScore ? (
          <p className="mt-5 text-sm text-ink-3">
            Judging one piece costs about US${perScore.toFixed(4)}, measured over the last 30 days.
          </p>
        ) : null}
      </Group>

      <Group
        title="Shops"
        line="A shop switched off is not read, judged or shown. The numbers are from the last run: shortlisted, good enough to show you, and what judging cost."
      >
        {e.stores ? (
          <p id="stores-error" role="alert" className="mb-3 text-sm text-alert">
            {e.stores}
          </p>
        ) : null}
        {stores.length === 0 ? (
          <p className="text-ink-3">No shops yet. They are added when the app starts and on every run.</p>
        ) : (
          <ul aria-describedby={e.stores ? 'stores-error' : undefined}>
            {stores.map((store) => (
              <li key={store.slug} className="border-b border-line last:border-b-0">
                <StoreSwitch store={store} on={on.has(store.slug)} />
              </li>
            ))}
          </ul>
        )}
      </Group>

      <div className="mt-14 space-y-4">
        {Object.keys(e).length > 0 ? <FormMessage message="Something above needs another look." /> : null}
        <FormMessage message={state?.message} />
        <SubmitButton pending="Saving">Save the finder</SubmitButton>
      </div>
    </form>
  )
}

/**
 * A shop's row is one label, so the whole row flips its switch. The switch is
 * a plain checkbox under a drawn track, so it posts with the form and works
 * before the page has hydrated.
 */
function StoreSwitch({ store, on }: { store: StoreCount; on: boolean }) {
  return (
    <label className="group flex min-h-18 cursor-pointer items-center justify-between gap-4 py-4">
      <span className="min-w-0">
        <span className="title block">{store.name}</span>
        <span className="tabular mt-0.5 block text-sm text-ink-2">
          {store.shortlisted.toLocaleString('en-NZ')} shortlisted, {store.finds.toLocaleString('en-NZ')}{' '}
          {store.finds === 1 ? 'find' : 'finds'}
          {store.usd > 0 ? `, US$${store.usd.toFixed(2)}` : ''}
        </span>
        <span className="tabular block text-sm text-ink-3">{store.products.toLocaleString('en-NZ')} pieces in stock</span>
      </span>
      <input type="checkbox" name="stores" value={store.slug} defaultChecked={on} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-line-strong transition-colors duration-150 peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-on-ink"
      >
        <span className="absolute top-0.5 left-0.5 size-6 rounded-full bg-raised transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none" />
      </span>
    </label>
  )
}

function limitHint(limit: number, perScore: number | null, what: string): string {
  if (!perScore || perScore <= 0) return `0 turns ${what} off.`
  const pieces = Math.floor(limit / perScore)
  return `About ${pieces.toLocaleString('en-NZ')} pieces judged. 0 turns ${what} off.`
}
