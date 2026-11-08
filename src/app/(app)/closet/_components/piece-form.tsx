'use client'

import { useActionState, useRef, useState, type CSSProperties, type Ref } from 'react'
import { useFormStatus } from 'react-dom'

import { ChoiceChips, Field, FormMessage, Select, SubmitButton, TextArea, TextInput, withEcho } from '@/components/ui/form'
import { CheckIcon, PlusIcon } from '@/components/ui/icons'
import type { OpenSlot } from '@/lib/pieces'
import { FITS, label } from '@/lib/profile-values'
import { GARMENT_GROUPS, GARMENT_LABELS, WARMTH_LABELS, WARMTHS, WORN_FOR, WORN_FOR_LABELS } from '@/lib/wardrobe-values'

import { submitPiece } from '../actions.ts'
import type { PieceFormValues, Swatch } from './piece-values.ts'

/*
 * Every field of a piece, for a new one and an edit. The colour is picked
 * from her palette, so the looks speak it; a colour read from a photo that is
 * not in it stays on offer as its own swatch, and any other can be picked.
 * The slot list follows the garment chosen, so a skirt can only fill a skirt
 * slot. Gym kit is the garment it is (a tank, leggings, sneakers) worn for
 * the gym; a piece filed as activewear before keeps that until she names it.
 */

export function PieceForm({
  id,
  origin,
  initial,
  best,
  neutrals,
  slots,
  submitLabel,
  another = false,
  onCancel,
}: {
  id?: number
  origin?: { source: string; photo_id: number | null; product_id: number | null }
  initial: PieceFormValues
  best: Swatch[]
  neutrals: Swatch[]
  slots: OpenSlot[]
  submitLabel: string
  /** A new piece can be saved straight into adding the next, for going round the closet with the camera. */
  another?: boolean
  onCancel?: () => void
}) {
  const [state, action] = useActionState(submitPiece, null)
  const e = state?.errors ?? {}
  const v = withEcho(initial, state?.values)
  const [garment, setGarment] = useState(v.garment_type)
  const forGarment = slots.filter((slot) => slot.garment_type === garment || String(slot.id) === v.slot_id)
  const groups = GARMENT_GROUPS.map((group) => ({
    title: group.title,
    types: group.types.filter((type) => type !== 'activewear' || initial.garment_type === 'activewear'),
  })).filter((group) => group.types.length > 0)

  return (
    <form action={action} className="max-w-2xl space-y-8" key={state?.values ? JSON.stringify(state.values) : 'saved'}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {origin ? (
        <>
          <input type="hidden" name="source" value={origin.source} />
          <input type="hidden" name="photo_id" value={origin.photo_id ?? ''} />
          <input type="hidden" name="product_id" value={origin.product_id ?? ''} />
        </>
      ) : null}

      <Field label="Name" name="name" error={e.name} hint="As you would describe it to a friend.">
        <TextInput name="name" defaultValue={v.name} error={e.name} placeholder="Rust silk slip skirt" />
      </Field>

      <Field
        label="What it is"
        name="garment_type"
        error={e.garment_type}
        hint={garment === 'activewear' ? 'Say what it is, a tank, leggings, sneakers, so it can go in a gym fit.' : undefined}
      >
        <select
          id="garment_type"
          name="garment_type"
          defaultValue={v.garment_type}
          onChange={(event) => setGarment(event.target.value)}
          aria-invalid={e.garment_type ? true : undefined}
          aria-describedby={e.garment_type ? 'garment_type-error' : undefined}
          className="input"
        >
          <option value="">Choose one</option>
          {groups.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.types.map((type) => (
                <option key={type} value={type}>
                  {GARMENT_LABELS[type]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <ColourField
        best={best}
        neutrals={neutrals}
        chosen={v.colour_hex}
        error={e.colour_hex}
        readAs={origin?.source === 'photo' ? 'As the photo reads' : origin?.source === 'link' ? 'As the shop’s photo reads' : 'Its colour'}
      />

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
        <Field label="Colour in words" name="colour_name" error={e.colour_name}>
          <TextInput name="colour_name" defaultValue={v.colour_name} error={e.colour_name} placeholder="Rust" />
        </Field>
        <Field label="Fabric" name="fabric" error={e.fabric}>
          <TextInput name="fabric" defaultValue={v.fabric} error={e.fabric} placeholder="Silk" />
        </Field>
      </div>

      <Field label="Fit" name="fit" error={e.fit}>
        <Select
          name="fit"
          defaultValue={v.fit}
          options={FITS.map((fit) => ({ value: fit, label: label(fit) }))}
          placeholder="No fit to speak of, or not sure"
          error={e.fit}
        />
      </Field>

      <div>
        <ChoiceChips
          name="warmth"
          legend="Warmth"
          options={WARMTHS.map((warmth) => ({ value: warmth, label: WARMTH_LABELS[warmth] }))}
          defaultValue={v.warmth}
          error={e.warmth}
        />
        <p className="mt-1.5 text-sm text-ink-3">Light for summer, mid for most Wellington days, warm for a southerly.</p>
      </div>

      <div>
        <ChoiceChips
          name="worn_for"
          legend="Worn for"
          options={WORN_FOR.map((use) => ({ value: use, label: WORN_FOR_LABELS[use] }))}
          defaultValue={v.worn_for}
          error={e.worn_for}
        />
        {e.worn_for ? null : (
          <p className="mt-1.5 text-sm text-ink-3">The gym keeps it to gym fits. Both is for the sneakers you train in and wear out.</p>
        )}
      </div>

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
        <Field label="Brand" name="brand" error={e.brand}>
          <TextInput name="brand" defaultValue={v.brand} error={e.brand} />
        </Field>
        <Field label="Size" name="size" error={e.size}>
          <TextInput name="size" defaultValue={v.size} error={e.size} placeholder="S, 10, EU 38" />
        </Field>
      </div>

      <Field
        label="Fills a plan slot"
        name="slot_id"
        error={e.slot_id}
        hint={
          garment && forGarment.length === 0
            ? 'No open slot in your plan asks for this kind of piece.'
            : 'The slot is marked owned and the finder stops looking for it.'
        }
      >
        <Select
          name="slot_id"
          defaultValue={v.slot_id}
          options={forGarment.map((slot) => ({ value: String(slot.id), label: slot.name }))}
          placeholder="None"
          error={e.slot_id}
        />
      </Field>

      <Field
        label="Notes"
        name="notes"
        error={e.notes}
        hint="Anything that matters when dressing it: a square neck, a cropped length, a slit."
      >
        <TextArea name="notes" defaultValue={v.notes} error={e.notes} rows={3} />
      </Field>

      <div className="space-y-4">
        <FormMessage message={state?.message ?? (Object.keys(e).length ? 'Check the fields marked above.' : undefined)} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending="Saving">{submitLabel}</SubmitButton>
          {another ? <AnotherButton /> : null}
          {onCancel ? (
            <button type="button" className="link px-2 text-ink-2" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  )
}

/**
 * The colour as swatches to pick: her best colours, her neutrals, the colour
 * a photo was read as when it is not one of hers, any other from the
 * system's picker, or none for a print. Each swatch is a real radio, named
 * for a screen reader and under the mouse.
 */
function ColourField({
  best,
  neutrals,
  chosen,
  error,
  readAs,
}: {
  best: Swatch[]
  neutrals: Swatch[]
  chosen: string
  error?: string
  /** What to call a colour that is set but not one of hers: read from a photo, or saved before. */
  readAs: string
}) {
  const known = new Set([...best, ...neutrals].map((swatch) => swatch.hex))
  const read = chosen && !known.has(chosen) ? chosen : null
  const [picked, setPicked] = useState<string | null>(null)
  const pickRadio = useRef<HTMLInputElement>(null)

  return (
    <fieldset>
      <legend className="field-label">Colour</legend>
      <p className="-mt-0.5 mb-4 text-sm text-ink-3">
        {best.length > 0
          ? 'The colour of yours it is, or is closest to.'
          : 'Draft your style guide and your own colours show here to pick from.'}
      </p>
      <div className="space-y-5">
        <SwatchRow title="Your best colours" swatches={best} chosen={chosen} />
        <SwatchRow title="Your neutrals" swatches={neutrals} chosen={chosen} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {read ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <SwatchRadio hex={read} name={readAs} defaultChecked />
              <span className="text-sm text-ink-2">{readAs}</span>
            </label>
          ) : null}
          {/* The system's colour picker comes first in the label, so a tap opens it; choosing a colour checks the radio. */}
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="color"
              value={picked ?? '#a4512f'}
              aria-label="Pick another colour"
              onChange={(event) => {
                setPicked(event.target.value)
                if (pickRadio.current) pickRadio.current.checked = true
              }}
              className="peer/picker sr-only"
            />
            {picked ? (
              <SwatchRadio hex={picked} name="Another colour" inputRef={pickRadio} defaultChecked={false} />
            ) : (
              <span className="grid size-11 place-items-center rounded-[0.625rem] bg-raised text-ink-3 shadow-[inset_0_0_0_1px_var(--line-strong)] peer-focus-visible/picker:outline-2 peer-focus-visible/picker:outline-offset-4 peer-focus-visible/picker:outline-accent">
                <PlusIcon className="size-5" />
              </span>
            )}
            <span className="text-sm text-ink-2">{picked ? 'Another colour' : 'Pick another colour'}</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <span className="relative grid size-11 place-items-center rounded-[0.625rem] bg-raised shadow-[inset_0_0_0_1px_var(--line-strong)] transition-transform duration-150 ease-out active:scale-[0.94] has-checked:ring-2 has-checked:ring-ink has-checked:ring-offset-2 has-checked:ring-offset-ground has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent motion-reduce:active:scale-100">
              <input type="radio" name="colour_hex" value="" defaultChecked={!chosen} aria-label="No single colour" className="sr-only" />
              <svg viewBox="0 0 44 44" aria-hidden className="absolute inset-0 size-full text-line-strong">
                <path d="M10 34 34 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm text-ink-2">No single colour, a print or a stripe</span>
          </label>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

function SwatchRow({ title, swatches, chosen }: { title: string; swatches: Swatch[]; chosen: string }) {
  if (swatches.length === 0) return null
  return (
    <div>
      <p className="caption mb-2">{title}</p>
      <div className="flex flex-wrap gap-2.5">
        {swatches.map((swatch) => (
          <label key={swatch.hex} className="cursor-pointer">
            <SwatchRadio hex={swatch.hex} name={swatch.name} defaultChecked={chosen === swatch.hex} />
          </label>
        ))}
      </div>
    </div>
  )
}

/** A swatch that is a radio: ringed in ink with a check when chosen. */
function SwatchRadio({
  hex,
  name,
  defaultChecked,
  inputRef,
}: {
  hex: string
  name: string
  defaultChecked: boolean
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <span
      data-colour={name}
      className="swatch group/swatch relative grid size-11 place-items-center rounded-[0.625rem] transition-transform duration-150 ease-out active:scale-[0.94] has-checked:ring-2 has-checked:ring-ink has-checked:ring-offset-2 has-checked:ring-offset-ground has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent motion-reduce:active:scale-100"
      style={{ '--swatch': hex } as CSSProperties}
    >
      <input
        ref={inputRef}
        type="radio"
        name="colour_hex"
        value={hex}
        defaultChecked={defaultChecked}
        aria-label={name}
        className="peer sr-only"
      />
      <CheckIcon className="size-5 text-white opacity-0 mix-blend-difference transition-opacity duration-150 peer-checked:opacity-100" />
    </span>
  )
}

/** Saves like the main button, then opens a fresh add form instead of the closet. */
function AnotherButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" name="then" value="another" disabled={pending} className="btn btn-quiet">
      Save and add another
    </button>
  )
}
