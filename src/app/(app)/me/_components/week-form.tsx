'use client'

import { useActionState } from 'react'

import { ChoiceChips, Field, FormMessage, SubmitButton, TextArea, withEcho } from '@/components/ui/form'
import type { Life } from '@/lib/profile'
import { WEEKDAY_SHORT, WEEKDAYS } from '@/lib/profile-values'

import { submitLife } from '../actions'

import { Group } from './group'

/*
 * How her week goes, roughly: the days she works, goes out, runs and trains,
 * and how often she travels. Outfits are dressed for it, and on the days she
 * trains Today adds a gym fit.
 */

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7].map((count) => ({ value: String(count), label: count === 0 ? 'None' : String(count) }))

const TRAVEL = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'a_few_times_a_year', label: 'A few times a year' },
  { value: 'monthly', label: 'Monthly or more' },
]

export function WeekForm({ life }: { life: Partial<Life> }) {
  const [state, action] = useActionState(submitLife, null)
  const e = state?.errors ?? {}
  const v = withEcho(
    {
      office: life.office,
      evenings_out: life.evenings_out,
      running: life.running,
      gym_days: life.gym_days?.join(',') ?? '',
      travel: life.travel,
      notes: life.notes,
    },
    state?.values,
  )
  const gymDays = String(v.gym_days ?? '')
    .split(',')
    .filter(Boolean)
  // A week saved before the days could be chosen said only how many.
  const countOnly = !life.gym_days?.length && life.gym ? life.gym : null

  return (
    <form action={action} className="max-w-2xl">
      <Group title="Days a week">
        <div className="space-y-6">
          <ChoiceChips name="office" legend="At work" options={DAYS} defaultValue={chosen(v.office)} error={e.office} />
          <ChoiceChips
            name="evenings_out"
            legend="Evenings out"
            options={DAYS}
            defaultValue={chosen(v.evenings_out)}
            error={e.evenings_out}
          />
          <ChoiceChips name="running" legend="Running" options={DAYS} defaultValue={chosen(v.running)} error={e.running} />
        </div>
      </Group>

      <Group
        title="The gym"
        line={
          countOnly
            ? `You said ${countOnly} ${countOnly === 1 ? 'day' : 'days'} a week. Tap which, and Today adds a gym fit on them.`
            : 'The days you train. On them, Today adds a gym fit to the outfit of the day.'
        }
      >
        {countOnly ? <input type="hidden" name="gym" value={countOnly} /> : null}
        <ChoiceChips
          name="gym_days"
          legend="Days you train"
          options={WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_SHORT[day] }))}
          defaultValue={gymDays}
          multiple
          error={e.gym_days}
        />
      </Group>

      <Group title="Everything else">
        <div className="space-y-6">
          <ChoiceChips name="travel" legend="How often you travel" options={TRAVEL} defaultValue={chosen(v.travel)} error={e.travel} />
          <Field
            label="Anything else about your days"
            name="notes"
            error={e.notes}
            hint="A dress code at work, walking up the hill to the office, a wedding coming up."
          >
            <TextArea name="notes" defaultValue={v.notes} error={e.notes} />
          </Field>
        </div>
      </Group>

      <div className="mt-14 space-y-4">
        {Object.keys(e).length > 0 ? <FormMessage message="Something above needs another look." /> : null}
        <FormMessage message={state?.message} />
        <SubmitButton pending="Saving">Save your week</SubmitButton>
      </div>
    </form>
  )
}

function chosen(value: string | number | null | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : String(value)
}
