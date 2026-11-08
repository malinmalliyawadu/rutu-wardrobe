'use client'

import { useActionState } from 'react'

import { Field, FormMessage, NumberInput, SubmitButton, withEcho } from '@/components/ui/form'
import type { Budget } from '@/lib/profile'

import { submitBudget } from '../actions'

import { Group } from './group'

/*
 * What she would spend, in New Zealand dollars: a month all in, and the most
 * for one piece of each kind. The finder drops anything over a ceiling before
 * Claude sees it.
 */

const KINDS: { name: keyof Omit<Budget, 'monthly'>; label: string }[] = [
  { name: 'tops', label: 'Tops' },
  { name: 'knits', label: 'Knits' },
  { name: 'dresses', label: 'Dresses' },
  { name: 'bottoms', label: 'Trousers, jeans and skirts' },
  { name: 'outerwear', label: 'Coats and jackets' },
  { name: 'shoes', label: 'Shoes' },
  { name: 'bags', label: 'Bags' },
  { name: 'jewellery', label: 'Jewellery' },
  { name: 'accessories', label: 'Scarves, belts and the rest' },
]

export function BudgetForm({ budget }: { budget: Partial<Budget> }) {
  const [state, action] = useActionState(submitBudget, null)
  const e = state?.errors ?? {}
  const v = withEcho(
    {
      monthly: budget.monthly,
      tops: budget.tops,
      knits: budget.knits,
      dresses: budget.dresses,
      bottoms: budget.bottoms,
      outerwear: budget.outerwear,
      shoes: budget.shoes,
      bags: budget.bags,
      jewellery: budget.jewellery,
      accessories: budget.accessories,
    },
    state?.values,
  )

  return (
    <form action={action} className="max-w-2xl">
      <Group title="A month">
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="All in" name="monthly" error={e.monthly}>
            <NumberInput name="monthly" defaultValue={v.monthly} unit="NZD" integer error={e.monthly} />
          </Field>
        </div>
      </Group>

      <Group title="The most for one piece" line="Anything dearer is left out of your finds.">
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {KINDS.map((kind) => (
            <Field key={kind.name} label={kind.label} name={kind.name} error={e[kind.name]}>
              <NumberInput name={kind.name} defaultValue={v[kind.name]} unit="NZD" integer error={e[kind.name]} />
            </Field>
          ))}
        </div>
      </Group>

      <div className="mt-14 space-y-4">
        {Object.keys(e).length > 0 ? <FormMessage message="Something above needs another look." /> : null}
        <FormMessage message={state?.message} />
        <SubmitButton pending="Saving">Save your budget</SubmitButton>
      </div>
    </form>
  )
}
