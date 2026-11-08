'use client'

import { useActionState, useState, type CSSProperties, type ReactNode } from 'react'

import { ChoiceChips, Field, FormMessage, SubmitButton, TextInput, withEcho } from '@/components/ui/form'
import { Swatch } from '@/components/ui/swatch'
import type { Analysis } from '@/lib/analysis'
import {
  BUILDS,
  CONTRAST_LEVELS,
  label,
  NECK_LENGTHS,
  SEASONS,
  SHOULDER_HIP,
  SKIN_DEPTHS,
  TORSO_LEG,
  UNDERTONES,
  WAIST_DEFINITIONS,
  type Season,
} from '@/lib/profile-values'
import { SEASON_INFO, seasonName } from '@/lib/seasons'

import { submitColouring } from '../actions'

/*
 * Confirm or correct the read. Every line is Claude's pick with why and how
 * sure, and the control to change it; the closed lists are chips, the season
 * a grid of the twelve with their colours. The season's ribbon above follows
 * the choice, so a correction can be judged by eye before it is saved.
 * Without a read (one confirmed before the read's shape changed), the same
 * form edits what is saved, without the reasoning.
 */

type Read = { value: string; confidence: number; why: string }

export type Saved = {
  season: Season | null
  undertone: string | null
  skin_depth: string | null
  contrast_level: string | null
  hair_colour: string | null
  hair_texture: string | null
  eye_colour: string | null
  build: string | null
  waist_definition: string | null
  shoulder_hip: string | null
  torso_leg: string | null
  neck_length: string | null
}

function options(values: readonly string[]) {
  return values.map((value) => ({ value, label: label(value) }))
}

export function ColouringForm({
  saved,
  analysis,
  confirmed,
}: {
  saved: Saved
  analysis: Analysis | null
  confirmed: boolean
}) {
  const [state, action] = useActionState(submitColouring, null)
  const e = state?.errors ?? {}
  const v = withEcho(saved, state?.values)
  const [season, setSeason] = useState<Season | null>((v.season as Season | null) ?? null)
  // The ribbon crossfades only when she changes the season, never as the page opens.
  const [changed, setChanged] = useState(false)
  const c = analysis?.colouring ?? null
  const p = analysis?.proportions ?? null

  return (
    <form action={action}>
      <section aria-labelledby="season" className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <SeasonHero season={season} pick={c?.season ?? null} animate={changed} />
        <SeasonPicker
          defaultValue={v.season as Season | null}
          pick={c?.season.value ?? null}
          runnerUp={c?.runner_up_season ?? null}
          onChange={(next) => {
            setSeason(next)
            setChanged(true)
          }}
          error={e.season}
        />
      </section>

      <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="colouring">
          <h2 id="colouring" className="headline">
            Colouring
          </h2>
          <div className="mt-2">
            <ReadRow read={c?.undertone}>
              <ChoiceChips name="undertone" legend="Undertone" options={options(UNDERTONES)} defaultValue={v.undertone} error={e.undertone} />
            </ReadRow>
            <ReadRow read={c?.skin_depth}>
              <ChoiceChips name="skin_depth" legend="Skin depth" options={options(SKIN_DEPTHS)} defaultValue={v.skin_depth} error={e.skin_depth} />
            </ReadRow>
            <ReadRow read={c?.contrast_level}>
              <ChoiceChips
                name="contrast_level"
                legend="Contrast between hair, skin and eyes"
                options={options(CONTRAST_LEVELS)}
                defaultValue={v.contrast_level}
                error={e.contrast_level}
              />
            </ReadRow>
            <ReadRow read={c?.hair_colour}>
              <Field label="Hair colour" name="hair_colour" error={e.hair_colour}>
                <TextInput name="hair_colour" defaultValue={v.hair_colour} error={e.hair_colour} />
              </Field>
            </ReadRow>
            <ReadRow read={c?.hair_texture}>
              <Field label="Hair texture" name="hair_texture" error={e.hair_texture}>
                <TextInput name="hair_texture" defaultValue={v.hair_texture} error={e.hair_texture} />
              </Field>
            </ReadRow>
            <ReadRow read={c?.eye_colour}>
              <Field label="Eye colour" name="eye_colour" error={e.eye_colour}>
                <TextInput name="eye_colour" defaultValue={v.eye_colour} error={e.eye_colour} />
              </Field>
            </ReadRow>
          </div>
        </section>

        <section aria-labelledby="proportions">
          <h2 id="proportions" className="headline">
            Proportions
          </h2>
          <div className="mt-2">
            <ReadRow read={p?.build}>
              <ChoiceChips name="build" legend="Build" options={options(BUILDS)} defaultValue={v.build} error={e.build} />
            </ReadRow>
            <ReadRow read={p?.waist_definition}>
              <ChoiceChips
                name="waist_definition"
                legend="Waist"
                options={options(WAIST_DEFINITIONS)}
                defaultValue={v.waist_definition}
                error={e.waist_definition}
              />
            </ReadRow>
            <ReadRow read={p?.shoulder_hip}>
              <ChoiceChips
                name="shoulder_hip"
                legend="Shoulders and hips"
                options={options(SHOULDER_HIP)}
                defaultValue={v.shoulder_hip}
                error={e.shoulder_hip}
              />
            </ReadRow>
            <ReadRow read={p?.torso_leg}>
              <ChoiceChips
                name="torso_leg"
                legend="Torso and legs"
                options={options(TORSO_LEG)}
                defaultValue={v.torso_leg}
                error={e.torso_leg}
              />
            </ReadRow>
            <ReadRow read={p?.neck_length}>
              <ChoiceChips name="neck_length" legend="Neck" options={options(NECK_LENGTHS)} defaultValue={v.neck_length} error={e.neck_length} />
            </ReadRow>
          </div>
        </section>
      </div>

      <div className="mt-14 max-w-xl space-y-4">
        {Object.keys(e).length > 0 ? <FormMessage message="Something above needs another look." /> : null}
        <FormMessage message={state?.message} />
        <SubmitButton pending="Saving">{confirmed ? 'Confirm again' : 'Confirm my read'}</SubmitButton>
        <p className="text-sm text-ink-3">
          {confirmed
            ? 'Confirming again replaces what you confirmed before. Your style guide is not redrafted on its own.'
            : 'Once confirmed, your palette and your style guide are drawn from it.'}
        </p>
      </div>
    </form>
  )
}

/**
 * The chosen season in large: its six colours cut as a ribbon with arched
 * heads, its name, how sure Claude was (only while it is Claude's own pick),
 * what it is in a sentence, and why.
 */
function SeasonHero({ season, pick, animate }: { season: Season | null; pick: Read | null; animate: boolean }) {
  const info = season ? SEASON_INFO[season] : null
  const isPick = pick !== null && pick.value === season
  return (
    <div aria-live="polite" className="lg:sticky lg:top-6 lg:self-start">
      <div
        role="img"
        aria-label={info ? `${seasonName(season!)}: ${info.swatches.map((swatch) => swatch.name).join(', ')}` : 'No season chosen'}
        className="flex h-44 gap-1.5 sm:h-56"
      >
        {(info?.swatches ?? BLANK).map((swatch, index) => (
          <span
            key={`${season ?? 'none'}-${index}`}
            data-colour={swatch.name || undefined}
            className={`swatch block h-full flex-1 rounded-b-[0.375rem] rounded-t-full ${animate ? 'crossfade' : ''}`}
            style={{ '--swatch': swatch.hex } as CSSProperties}
          />
        ))}
      </div>
      <h2 id="season" className="headline mt-6">
        {season ? seasonName(season) : 'Your season'}
      </h2>
      {isPick ? <p className="caption tabular mt-1.5">Claude&rsquo;s pick, {pick.confidence}% sure</p> : null}
      {pick && !isPick && season ? <p className="caption mt-1.5">Your choice; Claude read {seasonName(pick.value as Season)}</p> : null}
      {info ? (
        <p className="mt-3 text-ink-2">
          {info.traits} {info.metal === 'mixed' ? 'Gold or silver both work.' : `${label(info.metal)} jewellery.`}
        </p>
      ) : (
        <p className="mt-3 text-ink-2">Choose the season that is yours.</p>
      )}
      {isPick ? <p className="voice mt-4">{pick.why}</p> : null}
    </div>
  )
}

const BLANK = ['#ead4cf', '#dfc2bd', '#d1aea9', '#bf9893', '#a8807c', '#94706c'].map((hex) => ({ hex, name: '' }))

/** The twelve seasons, a family to a row from sm up, each with three of its colours. */
function SeasonPicker({
  defaultValue,
  pick,
  runnerUp,
  onChange,
  error,
}: {
  defaultValue: Season | null
  pick: Season | null
  runnerUp: Season | null
  onChange: (season: Season) => void
  error?: string
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="field-label">Season</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SEASONS.map((season) => (
          <label
            key={season}
            className="pressable flex min-h-15 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] [transition:transform_160ms_var(--ease-out),background-color_150ms_ease,color_150ms_ease] hover:not-has-[input:checked]:bg-accent-soft has-[input:checked]:bg-ink has-[input:checked]:text-on-ink has-[input:checked]:shadow-none has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-3 has-[input:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name="season"
              value={season}
              defaultChecked={defaultValue === season}
              onChange={() => onChange(season)}
              className="sr-only"
            />
            <span className="flex gap-0.5" aria-hidden>
              {SEASON_INFO[season].swatches.slice(0, 3).map((swatch) => (
                <Swatch key={swatch.hex} hex={swatch.hex} className="h-6 w-3 rounded-[0.1875rem]" />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-tight font-semibold">{seasonName(season)}</span>
              {season === pick ? (
                <span className="mt-0.5 block text-xs leading-tight opacity-70">Claude&rsquo;s pick</span>
              ) : season === runnerUp ? (
                <span className="mt-0.5 block text-xs leading-tight opacity-70">Runner-up</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

/** One line of the read: the control, then Claude's reason and how sure it was. */
function ReadRow({ read, children }: { read: Read | null | undefined; children: ReactNode }) {
  return (
    <div className="border-b border-line py-6 last:border-b-0">
      {children}
      {read ? (
        <p className="mt-3 text-sm text-ink-2">
          {read.why} <span className="tabular whitespace-nowrap text-ink-3">{read.confidence}% sure</span>
        </p>
      ) : null}
    </div>
  )
}
