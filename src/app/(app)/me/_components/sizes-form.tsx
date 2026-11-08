'use client'

import { useActionState } from 'react'

import { ChoiceChips, Field, FormMessage, NumberInput, SubmitButton, withEcho } from '@/components/ui/form'
import type { Fits, Sizes } from '@/lib/profile'
import { DRESS_SIZES, FITS, label, LETTER_SIZES } from '@/lib/profile-values'

import { submitSizes } from '../actions'

import { Group } from './group'

/*
 * Her sizes as shops label them: a letter, an AU dress size, a jeans waist,
 * a shoe; her measurements for the shops that give a chart; and the fit she
 * likes for each kind of piece. Anything she does not know stays blank.
 */

const FIT_OPTIONS = FITS.map((value) => ({ value, label: value === 'slim' ? 'Fitted' : label(value) }))

const FIT_KINDS: { name: keyof Fits; label: string }[] = [
  { name: 'tops', label: 'Tops' },
  { name: 'knits', label: 'Knits' },
  { name: 'dresses', label: 'Dresses' },
  { name: 'bottoms', label: 'Trousers, jeans and skirts' },
  { name: 'outerwear', label: 'Coats and jackets' },
]

export function SizesForm({
  heightCm,
  sizes,
  fits,
}: {
  heightCm: number | null
  sizes: Partial<Sizes>
  fits: Partial<Fits>
}) {
  const [state, action] = useActionState(submitSizes, null)
  const e = state?.errors ?? {}
  const v = withEcho(
    {
      height_cm: heightCm,
      letter: sizes.letter,
      dress: sizes.dress,
      jeans: sizes.jeans,
      bust_cm: sizes.bust_cm,
      waist_cm: sizes.waist_cm,
      hips_cm: sizes.hips_cm,
      inseam_cm: sizes.inseam_cm,
      shoe_eu: sizes.shoe_eu,
      shoe_au: sizes.shoe_au,
      tops: fits.tops,
      knits: fits.knits,
      dresses: fits.dresses,
      bottoms: fits.bottoms,
      outerwear: fits.outerwear,
    },
    state?.values,
  )

  return (
    <form action={action} className="max-w-2xl">
      <Group title="Your sizes">
        <div className="space-y-7">
          <ChoiceChips
            name="letter"
            legend="Letter size"
            options={LETTER_SIZES.map((size) => ({ value: size, label: size }))}
            defaultValue={v.letter === null || v.letter === undefined ? null : String(v.letter)}
            error={e.letter}
          />
          <div>
            <ChoiceChips
              name="dress"
              legend="Dress size, AU and NZ"
              options={DRESS_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              defaultValue={v.dress === null || v.dress === undefined ? null : String(v.dress)}
              error={e.dress}
            />
            {e.dress ? null : <p className="mt-1.5 text-sm text-ink-3">UK sizes are the same number.</p>}
          </div>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field label="Height" name="height_cm" error={e.height_cm}>
              <NumberInput name="height_cm" defaultValue={v.height_cm} unit="cm" error={e.height_cm} />
            </Field>
            <Field label="Jeans waist" name="jeans" error={e.jeans} hint="As denim is labelled: 26, 27, 28.">
              <NumberInput name="jeans" defaultValue={v.jeans} unit="in" integer error={e.jeans} />
            </Field>
          </div>
        </div>
      </Group>

      <Group title="Shoes">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Field label="EU" name="shoe_eu" error={e.shoe_eu}>
            <NumberInput name="shoe_eu" defaultValue={v.shoe_eu} error={e.shoe_eu} />
          </Field>
          <Field label="AU and NZ" name="shoe_au" error={e.shoe_au} hint="The same as US women's.">
            <NumberInput name="shoe_au" defaultValue={v.shoe_au} error={e.shoe_au} />
          </Field>
        </div>
      </Group>

      <Group title="Measurements" line="With a soft tape, over light clothes. For the shops that give a size chart.">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Field label="Bust" name="bust_cm" error={e.bust_cm} hint="Around the fullest part.">
            <NumberInput name="bust_cm" defaultValue={v.bust_cm} unit="cm" error={e.bust_cm} />
          </Field>
          <Field label="Waist" name="waist_cm" error={e.waist_cm} hint="At the narrowest.">
            <NumberInput name="waist_cm" defaultValue={v.waist_cm} unit="cm" error={e.waist_cm} />
          </Field>
          <Field label="Hips" name="hips_cm" error={e.hips_cm} hint="Around the fullest part.">
            <NumberInput name="hips_cm" defaultValue={v.hips_cm} unit="cm" error={e.hips_cm} />
          </Field>
          <Field label="Inseam" name="inseam_cm" error={e.inseam_cm} hint="Crotch to ankle.">
            <NumberInput name="inseam_cm" defaultValue={v.inseam_cm} unit="cm" error={e.inseam_cm} />
          </Field>
        </div>
      </Group>

      <Group title="How you like things to fit">
        <div className="space-y-6">
          {FIT_KINDS.map((kind) => (
            <ChoiceChips
              key={kind.name}
              name={kind.name}
              legend={kind.label}
              options={FIT_OPTIONS}
              defaultValue={v[kind.name] === null || v[kind.name] === undefined ? null : String(v[kind.name])}
              error={e[kind.name]}
            />
          ))}
        </div>
      </Group>

      <div className="mt-14 space-y-4">
        {Object.keys(e).length > 0 ? <FormMessage message="Something above needs another look." /> : null}
        <FormMessage message={state?.message} />
        <SubmitButton pending="Saving">Save your sizes</SubmitButton>
      </div>
    </form>
  )
}
