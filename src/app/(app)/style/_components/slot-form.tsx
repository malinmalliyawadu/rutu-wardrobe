'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { ChoiceChips, Field, FormMessage, NumberInput, Select, SubmitButton, TextArea, TextInput, withEcho } from '@/components/ui/form'
import { CheckIcon } from '@/components/ui/icons'
import { Swatch } from '@/components/ui/swatch'
import { FITS, label } from '@/lib/profile-values'
import { BUDGET_CATEGORY, GARMENT_LABELS, GARMENT_TYPES, PRIORITIES, PRIORITY_LABELS, type GarmentType } from '@/lib/wardrobe-values'

import { submitSlot } from '../plan/actions'
import type { PaletteSwatch, SlotFormValues } from './slot-values'

/**
 * Every field of a piece in the plan. Colours are picked from her palette
 * rather than typed, so the plan always speaks the palette the shops are
 * checked against; a colour already on the piece that the palette no longer
 * has stays available.
 */
export function SlotForm({
  id,
  initial,
  best,
  neutrals,
  ceilings,
}: {
  id?: number
  initial: SlotFormValues
  best: PaletteSwatch[]
  neutrals: PaletteSwatch[]
  ceilings: Record<string, number | null | undefined>
}) {
  const [state, action] = useActionState(submitSlot, null)
  const e = state?.errors ?? {}
  const echoed = state?.values
  const v = withEcho(
    {
      name: initial.name,
      why: initial.why,
      priority: String(initial.priority),
      garment_type: initial.garment_type,
      colour_family: initial.colour_family,
      fabrics: initial.fabrics,
      fit: initial.fit,
      size_labels: initial.size_labels,
      size_note: initial.size_note,
      budget_min: initial.budget_min,
      budget_max: initial.budget_max,
    },
    echoed,
  )
  const chosen = new Set(echoed ? (echoed.colours ?? '').split(',').filter(Boolean) : initial.colours)
  const known = new Set([...best, ...neutrals].map((swatch) => swatch.hex))
  const others = [...chosen].filter((hex) => !known.has(hex)).map((hex) => ({ hex, name: hex }))
  const [garment, setGarment] = useState(v.garment_type)
  const category = garment && garment in BUDGET_CATEGORY ? BUDGET_CATEGORY[garment as GarmentType] : null
  const ceiling = category ? ceilings[category] : null

  return (
    <form action={action} className="max-w-2xl space-y-8" key={echoed ? JSON.stringify(echoed) : 'saved'}>
      {id ? <input type="hidden" name="id" value={id} /> : null}

      <Field label="Name" name="name" error={e.name} hint="As you would ask for it in a shop.">
        <TextInput name="name" defaultValue={v.name} error={e.name} placeholder="Oxblood fine merino crew-neck" />
      </Field>

      <Field label="Why" name="why" error={e.why} hint="One sentence. The shops are judged against it too.">
        <TextArea name="why" defaultValue={v.why} error={e.why} rows={3} />
      </Field>

      <ChoiceChips
        name="priority"
        legend="When"
        options={PRIORITIES.map((priority) => ({ value: String(priority), label: PRIORITY_LABELS[priority].title }))}
        defaultValue={String(v.priority)}
        error={e.priority ? 'Choose when' : undefined}
      />

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-4">
        <Field label="Garment" name="garment_type" error={e.garment_type}>
          <Select
            name="garment_type"
            defaultValue={v.garment_type}
            options={GARMENT_TYPES.map((type) => ({ value: type, label: GARMENT_LABELS[type] }))}
            placeholder="Choose one"
            error={e.garment_type}
            onChange={setGarment}
          />
        </Field>
        <Field label="Fit" name="fit" error={e.fit}>
          <Select name="fit" defaultValue={v.fit} options={FITS.map((fit) => ({ value: fit, label: label(fit) }))} placeholder="Any, or no fit to speak of" error={e.fit} />
        </Field>
      </div>

      <fieldset>
        <legend className="field-label">Colours</legend>
        <p className="-mt-0.5 mb-4 text-sm text-ink-3">From your palette, one to three.</p>
        <SwatchPicker title="Your best colours" swatches={best} chosen={chosen} />
        <SwatchPicker title="Your neutrals" swatches={neutrals} chosen={chosen} />
        {others.length ? <SwatchPicker title="Not in your palette" swatches={others} chosen={chosen} /> : null}
        {e.colours ? (
          <p role="alert" className="mt-1.5 text-sm text-alert">
            {e.colours}
          </p>
        ) : null}
      </fieldset>

      <Field label="The colour in words" name="colour_family" error={e.colour_family} hint="What the shops' listings are searched for.">
        <TextInput name="colour_family" defaultValue={v.colour_family} error={e.colour_family} placeholder="Oxblood" />
      </Field>

      <Field label="Cloth" name="fabrics" error={e.fabrics} hint="In order of preference, with commas between.">
        <TextInput name="fabrics" defaultValue={v.fabrics} error={e.fabrics} placeholder="Merino, cashmere" />
      </Field>

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-4">
        <Field label="Sizes to look for" name="size_labels" error={e.size_labels} hint="As shops print them, with commas between.">
          <TextInput name="size_labels" defaultValue={v.size_labels} error={e.size_labels} placeholder="S, 10, EU 38" />
        </Field>
        <Field label="A note on size" name="size_note" error={e.size_note}>
          <TextInput name="size_note" defaultValue={v.size_note} error={e.size_note} placeholder="Size down in this cut" />
        </Field>
      </div>

      <fieldset>
        <legend className="field-label">What to spend</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From" name="budget_min" error={e.budget_min}>
            <NumberInput name="budget_min" defaultValue={v.budget_min} unit="NZD" integer error={e.budget_min} />
          </Field>
          <Field label="Up to" name="budget_max" error={e.budget_max}>
            <NumberInput name="budget_max" defaultValue={v.budget_max} unit="NZD" integer error={e.budget_max} />
          </Field>
        </div>
        <p className="mt-1.5 text-sm text-ink-3">
          {category ? (
            ceiling ? (
              `The most you spend on ${category} is $${ceiling}.`
            ) : (
              <>
                No limit set for {category}.{' '}
                <Link href="/me/budget" className="text-accent underline decoration-accent/40 underline-offset-4">
                  Set one
                </Link>
              </>
            )
          ) : (
            'Whole New Zealand dollars.'
          )}
        </p>
      </fieldset>

      {id ? null : (
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="status" value="owned" className="size-5 accent-[var(--accent)]" />I already own this
        </label>
      )}

      <div className="space-y-4 pt-2">
        <FormMessage message={state?.message ?? (Object.keys(e).length ? 'Check the fields marked above.' : undefined)} />
        <SubmitButton pending="Saving">{id ? 'Save the changes' : 'Add it to the plan'}</SubmitButton>
      </div>
    </form>
  )
}

/** Her palette as toggles; a chosen colour wears an ink ring and a tick. */
function SwatchPicker({ title, swatches, chosen }: { title: string; swatches: PaletteSwatch[]; chosen: Set<string> }) {
  if (swatches.length === 0) return null
  return (
    <div className="mb-5">
      <p className="caption mb-2">{title}</p>
      <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-8">
        {swatches.map((swatch) => (
          <label
            key={swatch.hex}
            className="pressable group relative block cursor-pointer rounded-[0.5rem] has-[:checked]:outline-2 has-[:checked]:outline-offset-2 has-[:checked]:outline-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input type="checkbox" name="colours" value={swatch.hex} defaultChecked={chosen.has(swatch.hex)} className="peer sr-only" />
            <span className="sr-only">{swatch.name}</span>
            <Swatch hex={swatch.hex} name={swatch.name} className="block aspect-[3/4] w-full rounded-[0.5rem]" />
            <span className="absolute top-1.5 right-1.5 hidden size-5 place-items-center rounded-full bg-ink text-on-ink peer-checked:grid">
              <CheckIcon className="size-3.5" strokeWidth={2.4} />
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
