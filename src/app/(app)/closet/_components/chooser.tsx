'use client'

import { useActionState, useState } from 'react'

import { tryChosenOn } from '@/app/actions/try-on'
import { FormMessage, SubmitButton } from '@/components/ui/form'
import { CheckIcon } from '@/components/ui/icons'
import { ButtonLink } from '@/components/ui/layout'
import { PiecePicture } from '@/components/ui/photos'
import type { Choice } from '@/lib/on-me'
import { choiceKey } from '@/lib/outfit-key'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

/*
 * Her saved finds and her pieces as tiles to tick, with the count and the
 * button held in a bar at the bottom of the screen so she never scrolls back
 * for it. Each tile is a real checkbox, so the form posts what is ticked and
 * a screen reader reads it as one; the ticks are held in state, so a refusal
 * from the server keeps them. When what is ticked was already put on her
 * (`kept`, by outfit key), the button opens that picture instead.
 */

export function Chooser({
  groups,
  max,
  kept,
}: {
  groups: { title: string; choices: Choice[] }[]
  max: number
  kept: Record<string, number>
}) {
  const [state, action] = useActionState(tryChosenOn, null)
  const [chosen, setChosen] = useState<string[]>([])
  const full = chosen.length >= max
  const made = chosen.length > 0 ? kept[choiceKey(chosen)] : undefined

  function toggle(key: string) {
    setChosen((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  return (
    <form action={action}>
      {groups.map((group) => (
        <fieldset key={group.title} className="mt-14 first:mt-0 lg:mt-20">
          <legend className="mb-5 flex w-full items-baseline justify-between gap-4">
            <span className="headline">{group.title}</span>
            <span className="caption tabular">{group.choices.length}</span>
          </legend>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {group.choices.map((choice) => {
              const on = chosen.includes(choice.key)
              return (
                <li key={choice.key}>
                  <Tile choice={choice} on={on} disabled={full && !on} onToggle={() => toggle(choice.key)} />
                </li>
              )
            })}
          </ul>
        </fieldset>
      ))}

      <div className="sticky bottom-[calc(3.75rem+1px+env(safe-area-inset-bottom)+0.75rem)] z-20 mt-12 lg:bottom-6">
        <div className="card flex items-center justify-between gap-4 px-4 py-3 shadow-[inset_0_0_0_1px_var(--line-strong)] sm:px-5">
          <div aria-live="polite" className="min-w-0">
            <p className="tabular font-medium">{chosen.length === 0 ? 'Nothing chosen yet' : `${chosen.length} of ${max} chosen`}</p>
            {state?.message ? (
              <FormMessage message={state.message} />
            ) : (
              <p className="text-sm text-ink-3">
                {made !== undefined
                  ? 'Already on you'
                  : chosen.length === 0
                    ? `Up to ${max} pieces`
                    : 'What you leave out stays as you are'}
              </p>
            )}
          </div>
          {made !== undefined ? (
            <ButtonLink href={`/closet/try-ons/${made}`} className="shrink-0">
              See the picture
            </ButtonLink>
          ) : chosen.length > 0 ? (
            <SubmitButton pending="Asking" className="shrink-0">
              See them on me
            </SubmitButton>
          ) : (
            <button type="button" disabled className="btn btn-primary shrink-0">
              See them on me
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

function Tile({ choice, on, disabled, onToggle }: { choice: Choice; on: boolean; disabled: boolean; onToggle: () => void }) {
  // Two colours of one product share a name, so each tile says its colour first.
  const sub = choice.colour_name
    ? sentence(choice.colour_name)
    : (choice.retailer ?? (choice.garment_type ? GARMENT_LABELS[choice.garment_type] : null))
  return (
    <label className={`group block cursor-pointer ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>
      <input
        type="checkbox"
        name="choice"
        value={choice.key}
        aria-label={sub ? `${choice.name}, ${sub}` : choice.name}
        checked={on}
        disabled={disabled}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        className={`relative block rounded-[var(--radius-tile)] transition-transform duration-150 ease-out group-active:scale-[0.97] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent motion-reduce:group-active:scale-100 ${on ? 'ring-2 ring-ink ring-offset-2 ring-offset-ground' : ''}`}
      >
        <PiecePicture
          piece={choice}
          label={choice.photo || choice.image ? undefined : choice.garment_type ? GARMENT_LABELS[choice.garment_type] : undefined}
          sizes="(min-width: 1024px) 12rem, (min-width: 640px) 9rem, 30vw"
          className="block aspect-[3/4] w-full"
        />
        <span
          aria-hidden
          className={`absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink text-on-ink transition-[opacity,transform] duration-150 ease-out ${on ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
        >
          <CheckIcon className="size-3.5" strokeWidth={2.6} />
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block text-sm leading-snug font-medium">{choice.name}</span>
      {sub ? <span className="mt-0.5 block truncate text-xs text-ink-3">{sub}</span> : null}
    </label>
  )
}

function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
