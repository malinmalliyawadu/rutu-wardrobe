'use client'

import { useActionState, useState } from 'react'

import { Field, FormMessage, SubmitButton, TextInput, withEcho } from '@/components/ui/form'
import { OUTFIT_SOURCES, SOURCE_LABELS, type OutfitSource } from '@/lib/outfit-values'

import { askOutfit } from '../actions.ts'

const HINTS: Record<OutfitSource, string> = {
  closet: 'Only what you own, as a look you can save and wear.',
  shops: 'Nothing you own: a whole outfit to buy, in your size.',
  both: 'What you own, and from the shops only what it lacks.',
  anywhere: 'Tied to no shop and to nothing you own: the ideal pieces, described.',
}

/** Shown while that source's radio is checked. Written out in full so Tailwind finds them. */
const WHILE_CHECKED: Record<OutfitSource, string> = {
  closet: 'group-has-[input[value=closet]:checked]/ask:block',
  shops: 'group-has-[input[value=shops]:checked]/ask:block',
  both: 'group-has-[input[value=both]:checked]/ask:block',
  anywhere: 'group-has-[input[value=anywhere]:checked]/ask:block',
}

/** Briefs to start from: a tap puts one in the field, to send as it is or to add to. */
const PROMPTS = [
  'A friend’s wedding, outdoors',
  'Dinner on Cuba Street',
  'Drinks after work',
  'A big meeting at work',
  'Brunch with the girls',
  'A long weekend in Queenstown',
  'A wet, windy day in town',
  'Something bolder than I usually wear',
]

/**
 * The ask: what the outfit is for, in her words or from a prompt she taps,
 * and what it is made from. An outfit from anything sends her photo to OpenAI
 * as soon as it is made, so the form says that above the button and the
 * button says it too. Both follow the checked radio in CSS, not in React
 * state: a tap on a slow phone before the page has hydrated still shows the
 * notice. It is never chosen for her, whatever she last asked for.
 */
export function AskOutfit({
  sources,
  initial,
  canPicture,
}: {
  sources: OutfitSource[]
  initial: OutfitSource
  /** Whether an outfit from anything can get its picture: a full-length photo and an OpenAI key. */
  canPicture: boolean
}) {
  const [state, action] = useActionState(askOutfit, null)
  const v = withEcho({ brief: '', source: initial }, state?.values)
  // A tapped prompt replaces what the field holds; the count remounts it even when the same one is tapped twice.
  const [prompt, setPrompt] = useState({ text: v.brief ?? '', taps: 0 })
  const source = sources.includes(v.source as OutfitSource) ? (v.source as OutfitSource) : initial

  return (
    <form action={action} className="group/ask max-w-2xl space-y-6" key={state?.values ? JSON.stringify(state.values) : `blank-${initial}`}>
      <div>
        <Field label="What is it for?" name="brief">
          <TextInput key={prompt.taps} name="brief" defaultValue={prompt.text} placeholder="An ordinary day this week" />
        </Field>
        <div
          role="group"
          aria-label="Things to start from"
          className="-mx-[var(--gutter)] mt-3 flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {PROMPTS.map((text) => (
            <button key={text} type="button" className="chip shrink-0" onClick={() => setPrompt({ text, taps: prompt.taps + 1 })}>
              {text}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Made from</legend>
        <div className="flex flex-wrap gap-2">
          {OUTFIT_SOURCES.filter((option) => sources.includes(option)).map((option) => (
            <label key={option} className="chip">
              <input type="radio" name="source" value={option} defaultChecked={source === option} />
              {SOURCE_LABELS[option]}
            </label>
          ))}
        </div>
        <div aria-live="polite">
          {sources.map((option) => (
            <p key={option} className={`mt-2 hidden text-sm text-ink-3 ${WHILE_CHECKED[option]}`}>
              {HINTS[option]}
            </p>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className={`prose-measure hidden text-ink-2 ${WHILE_CHECKED.anywhere}`}>
        {canPicture
          ? 'Your full-length photo goes to OpenAI as soon as the outfit is made, with the pieces in words and no other photo, so you can see yourself in it. One picture, kept with your photos. OpenAI does not train on it and holds it for up to 30 days.'
          : 'Add a full-length photo under Me, Photos and an outfit from anything comes with a picture of you in it. Until then it comes back in words.'}
      </p>

      <div className="space-y-3">
        <SubmitButton pending="Starting">
          {canPicture ? (
            <>
              <span className="group-has-[input[value=anywhere]:checked]/ask:hidden">Make an outfit</span>
              <span className="hidden group-has-[input[value=anywhere]:checked]/ask:inline">Make it and show me in it</span>
            </>
          ) : (
            'Make an outfit'
          )}
        </SubmitButton>
        <FormMessage message={state?.message} />
      </div>
    </form>
  )
}
