'use client'

import { useActionState, useState, type CSSProperties } from 'react'

import { Field, FormMessage, Select, SubmitButton, TextArea, withEcho } from '@/components/ui/form'
import { FITS, label } from '@/lib/profile-values'
import type { FitEntry, Palette, RuleSectionName, Section } from '@/lib/style-guide'
import { GARMENT_LABELS, GARMENT_TYPES, METALS, normaliseHex } from '@/lib/wardrobe-values'

import { submitFits, submitPalette, submitSection } from '../palette/actions'
import { AddRow, RemoveRow, RowField, formMessage, fromEcho, keyed, rowInput, useRows, type Keyed } from './rows'

/*
 * The guide's editors, one per part: her colours, a part's rules, the fits.
 * Rows are added and removed in place; a failed save keeps every row as she
 * left it and marks the ones to fix.
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

type ColourRow = { hex: string; name: string; note: string }

function colourRows(
  echo: Record<string, string> | undefined,
  prefix: string,
  noteField: 'use' | 'why',
  saved: { hex: string; name: string; use?: string; why?: string }[],
): Keyed<ColourRow>[] {
  if (echo) {
    return fromEcho(echo, prefix, ['hex', 'name', noteField] as const).map(({ key, value }) => ({
      key,
      value: { hex: value.hex, name: value.name, note: value[noteField] },
    }))
  }
  return keyed(saved.map((colour) => ({ hex: colour.hex, name: colour.name, note: colour[noteField] ?? '' })))
}

export function PaletteForm({ palette }: { palette: Palette }) {
  const [state, action] = useActionState(submitPalette, null)
  const errors = state?.errors ?? {}
  const v = withEcho({ summary: palette.summary, metal: palette.metal, metal_why: palette.metal_why }, state?.values)

  return (
    <form action={action} className="max-w-2xl space-y-12" key={state?.values ? JSON.stringify(state.values) : 'saved'}>
      <Field label="How your palette works" name="summary" error={errors.summary}>
        <TextArea name="summary" defaultValue={v.summary} rows={4} error={errors.summary} />
      </Field>

      <ColourList
        title="Your best colours"
        hint="The first five are the ribbon beside your name. Tap a swatch to pick by eye, or type the hex."
        prefix="best"
        noteField="use"
        noteLabel="Where it works"
        arched
        initial={colourRows(state?.values, 'best', 'use', palette.best)}
        errors={errors}
      />
      <ColourList
        title="Your neutrals"
        prefix="neutrals"
        noteField="use"
        noteLabel="Where it works"
        initial={colourRows(state?.values, 'neutrals', 'use', palette.neutrals)}
        errors={errors}
      />
      <ColourList
        title="Keep away from your face"
        prefix="avoid"
        noteField="why"
        noteLabel="What it does"
        initial={colourRows(state?.values, 'avoid', 'why', palette.avoid)}
        errors={errors}
      />

      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
        <Field label="Your metal" name="metal" error={errors.metal}>
          <Select name="metal" defaultValue={v.metal} options={METALS.map((metal) => ({ value: metal, label: label(metal) }))} error={errors.metal} />
        </Field>
        <Field label="Why that metal" name="metal_why" error={errors.metal_why}>
          <TextArea name="metal_why" defaultValue={v.metal_why} rows={2} error={errors.metal_why} />
        </Field>
      </div>

      <div className="space-y-4">
        <FormMessage message={errors.best ?? formMessage(state)} />
        <SubmitButton pending="Saving">Save your colours</SubmitButton>
      </div>
    </form>
  )
}

function ColourList({
  title,
  hint,
  prefix,
  noteField,
  noteLabel,
  arched = false,
  initial,
  errors,
}: {
  title: string
  hint?: string
  prefix: string
  noteField: 'use' | 'why'
  noteLabel: string
  arched?: boolean
  initial: Keyed<ColourRow>[]
  errors: Record<string, string>
}) {
  const { rows, add, remove } = useRows(initial, () => ({ hex: '', name: '', note: '' }))
  return (
    <fieldset>
      <legend className="headline">{title}</legend>
      {hint ? <p className="mt-2 text-sm text-ink-3">{hint}</p> : null}
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((row, index) => (
          <li key={row.key} className="py-5">
            <ColourEditor
              prefix={prefix}
              rowKey={row.key}
              initial={row.value}
              noteField={noteField}
              noteLabel={noteLabel}
              arched={arched}
              errors={errors}
              position={index + 1}
              onRemove={() => remove(row.key)}
            />
          </li>
        ))}
      </ul>
      <AddRow onClick={add}>Add a colour</AddRow>
    </fieldset>
  )
}

/**
 * One colour. The swatch is the native colour picker, so on a phone a tap
 * opens the system wheel; the hex beside it is the exact value, and the two
 * stay in step.
 */
function ColourEditor({
  prefix,
  rowKey,
  initial,
  noteField,
  noteLabel,
  arched,
  errors,
  position,
  onRemove,
}: {
  prefix: string
  rowKey: number
  initial: ColourRow
  noteField: 'use' | 'why'
  noteLabel: string
  arched: boolean
  errors: Record<string, string>
  position: number
  onRemove: () => void
}) {
  const [hex, setHex] = useState(initial.hex)
  const valid = normaliseHex(hex)
  const hexField = rowInput(prefix, rowKey, 'hex', errors)
  const nameField = rowInput(prefix, rowKey, 'name', errors)
  const noteInput = rowInput(prefix, rowKey, noteField, errors)

  return (
    <div className="flex items-start gap-4">
      <label
        className={`swatch pressable relative block h-[5.5rem] w-14 shrink-0 cursor-pointer overflow-hidden has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-accent ${
          arched ? 'rounded-[var(--radius-arch)]' : 'rounded-[var(--radius-tile)]'
        }`}
        style={{ '--swatch': valid ?? 'transparent' } as CSSProperties}
      >
        <span className="sr-only">Pick colour {position} by eye</span>
        <input type="color" value={valid ?? '#000000'} onChange={(event) => setHex(event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="grid min-w-0 flex-1 grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
        <RowField label="Hex" htmlFor={hexField.props.id} error={hexField.error}>
          <input
            {...hexField.props}
            type="text"
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="input tabular"
          />
        </RowField>
        <RowField label="Name" htmlFor={nameField.props.id} error={nameField.error}>
          <input {...nameField.props} type="text" defaultValue={initial.name} autoComplete="off" className="input" />
        </RowField>
        <div className="col-span-2">
          <RowField label={noteLabel} htmlFor={noteInput.props.id} error={noteInput.error}>
            <input {...noteInput.props} type="text" defaultValue={initial.note} autoComplete="off" className="input" />
          </RowField>
        </div>
      </div>
      <RemoveRow label={`Take out colour ${position}`} onClick={onRemove} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// A part's rules
// ---------------------------------------------------------------------------

type RuleRow = { topic: string; rule: string }

export function SectionForm({ name, section }: { name: RuleSectionName; section: Section }) {
  const [state, action] = useActionState(submitSection, null)
  const errors = state?.errors ?? {}
  const v = withEcho({ summary: section.summary }, state?.values)
  const initial: Keyed<RuleRow>[] = state?.values ? fromEcho(state.values, 'rules', ['topic', 'rule'] as const) : keyed(section.rules)

  return (
    <form action={action} className="max-w-2xl space-y-10" key={state?.values ? JSON.stringify(state.values) : 'saved'}>
      <input type="hidden" name="section" value={name} />
      <Field label="The idea the rules follow from" name="summary" error={errors.summary}>
        <TextArea name="summary" defaultValue={v.summary} rows={3} error={errors.summary} />
      </Field>
      <Rules initial={initial} errors={errors} />
      <div className="space-y-4">
        <FormMessage message={formMessage(state)} />
        <SubmitButton pending="Saving">Save</SubmitButton>
      </div>
    </form>
  )
}

function Rules({ initial, errors }: { initial: Keyed<RuleRow>[]; errors: Record<string, string> }) {
  const { rows, add, remove } = useRows(initial, () => ({ topic: '', rule: '' }))
  return (
    <fieldset>
      <legend className="headline">The rules</legend>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((row, index) => {
          const topic = rowInput('rules', row.key, 'topic', errors)
          const rule = rowInput('rules', row.key, 'rule', errors)
          return (
            <li key={row.key} className="flex items-start gap-3 py-5">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <RowField label="About" htmlFor={topic.props.id} error={topic.error}>
                  <input {...topic.props} type="text" defaultValue={row.value.topic} autoComplete="off" className="input" />
                </RowField>
                <RowField label="The rule" htmlFor={rule.props.id} error={rule.error}>
                  <textarea {...rule.props} defaultValue={row.value.rule} rows={3} className="input" />
                </RowField>
              </div>
              <RemoveRow label={`Take out rule ${index + 1}`} onClick={() => remove(row.key)} />
            </li>
          )
        })}
      </ul>
      <AddRow onClick={add}>Add a rule</AddRow>
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Fits
// ---------------------------------------------------------------------------

type FitRow = { garment: string; note: string; fits: string[] }

const FIT_FIELDS = ['garment', 'note', ...FITS] as const

export function FitsForm({ fits }: { fits: FitEntry[] }) {
  const [state, action] = useActionState(submitFits, null)
  const errors = state?.errors ?? {}
  const initial: Keyed<FitRow>[] = state?.values
    ? fromEcho(state.values, 'fits', FIT_FIELDS).map(({ key, value }) => ({
        key,
        value: { garment: value.garment, note: value.note, fits: FITS.filter((fit) => value[fit]) },
      }))
    : keyed(fits.map((entry) => ({ garment: entry.garment, note: entry.note, fits: entry.fits })))

  return (
    <form action={action} className="max-w-2xl space-y-10" key={state?.values ? JSON.stringify(state.values) : 'saved'}>
      <FitRows initial={initial} errors={errors} />
      <div className="space-y-4">
        <FormMessage message={formMessage(state)} />
        <SubmitButton pending="Saving">Save your fits</SubmitButton>
      </div>
    </form>
  )
}

function FitRows({ initial, errors }: { initial: Keyed<FitRow>[]; errors: Record<string, string> }) {
  const { rows, add, remove } = useRows(initial, () => ({ garment: '', note: '', fits: [] }))
  return (
    <fieldset>
      <legend className="sr-only">Fits by garment</legend>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((row, index) => {
          const garment = rowInput('fits', row.key, 'garment', errors)
          const note = rowInput('fits', row.key, 'note', errors)
          return (
            <li key={row.key} className="flex items-start gap-3 py-5">
              <div className="grid min-w-0 flex-1 gap-4">
                <RowField label="Garment" htmlFor={garment.props.id} error={garment.error}>
                  <select {...garment.props} defaultValue={row.value.garment} className="input">
                    <option value="">Choose one</option>
                    {GARMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {GARMENT_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </RowField>
                <div role="group" aria-label={`Fits that work, row ${index + 1}`} className="flex flex-wrap gap-2">
                  {FITS.map((fit) => (
                    <label key={fit} className="chip">
                      <input type="checkbox" name={`fits.${row.key}.${fit}`} value="on" defaultChecked={row.value.fits.includes(fit)} />
                      {label(fit)}
                    </label>
                  ))}
                </div>
                <RowField label="What to look for in the cut" htmlFor={note.props.id} error={note.error}>
                  <input {...note.props} type="text" defaultValue={row.value.note} autoComplete="off" className="input" />
                </RowField>
              </div>
              <RemoveRow label={`Take out row ${index + 1}`} onClick={() => remove(row.key)} />
            </li>
          )
        })}
      </ul>
      <AddRow onClick={add}>Add a garment</AddRow>
    </fieldset>
  )
}
