'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Spinner } from '@/components/ui/form'
import { CheckIcon } from '@/components/ui/icons'

import { applyToTaste, summarise } from '../actions'

/*
 * The stylist's note among the pins: what the board says. The first card of
 * the board from the laptop up, after the pictures on the phone. Until a few
 * pins are read it says how many more; then it offers to read the board;
 * then it is the summary, its threads, and "Add to my taste".
 */

export type NoteView =
  | { kind: 'few'; read: number; needed: number }
  | { kind: 'ready'; read: number }
  | {
      kind: 'summary'
      id: number
      summary: string
      threads: string[]
      /** "From 12 pins on 8 November, under US$0.01". */
      line: string
      /** Pins read since, and pins gone, as a sentence; null when it is up to date. */
      drift: string | null
      applied: boolean
      /** Her taste already carries an older summary, so this one replaces it. */
      replaces: boolean
    }

export function BoardNote({ note, className = '' }: { note: NoteView; className?: string }) {
  return (
    <section aria-label="What your board says" className={`card px-5 py-6 sm:px-7 sm:py-7 lg:px-6 ${className}`}>
      <h2 className="caption">
        What your board says
      </h2>
      {note.kind === 'few' ? (
        <p className="mt-3 text-ink-2">
          {note.read === 0
            ? `Once ${note.needed} pins are read, Claude can say what they have in common.`
            : `${note.read} read so far. Pin ${note.needed - note.read} more and Claude can say what they have in common.`}
        </p>
      ) : note.kind === 'ready' ? (
        <>
          <p className="mt-3 text-ink-2">Claude can read your {note.read} pins together and tell you what you keep coming back to.</p>
          <div className="mt-5">
            <Summarise label="Read my board" />
          </div>
        </>
      ) : (
        <>
          <p className="voice mt-3 text-[1.25rem] leading-[1.4] text-ink">{note.summary}</p>
          {note.threads.length > 0 ? (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {note.threads.map((thread) => (
                <li key={thread} className="py-2.5 text-[0.9375rem] first-letter:uppercase">
                  {thread}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {note.applied ? (
              <Link href="/me/taste" className="link gap-1.5 text-sm">
                <CheckIcon className="size-5" />
                In your taste
              </Link>
            ) : (
              <Apply id={note.id} replaces={note.replaces} />
            )}
            {note.drift ? <Summarise label="Read it again" quiet /> : null}
          </div>
          {note.drift ? <p className="mt-1 text-sm text-ink-2">{note.drift}</p> : null}
          <p className="caption mt-4">{note.line}.</p>
        </>
      )}
    </section>
  )
}

function Summarise({ label, quiet = false }: { label: string; quiet?: boolean }) {
  const [state, action, pending] = useActionState(summarise, null)
  return (
    <form action={action}>
      {quiet ? (
        <button type="submit" className="link text-sm" disabled={pending}>
          {pending ? 'Reading your board' : label}
        </button>
      ) : (
        <button type="submit" className="btn btn-quiet btn-small" disabled={pending} aria-busy={pending || undefined}>
          {pending ? (
            <>
              <Spinner />
              Reading your board
            </>
          ) : (
            label
          )}
        </button>
      )}
      {state?.message ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

function Apply({ id, replaces }: { id: number; replaces: boolean }) {
  const [state, action, pending] = useActionState(applyToTaste, null)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-quiet btn-small" disabled={pending} aria-busy={pending || undefined}>
        {pending ? (
          <>
            <Spinner />
            Adding
          </>
        ) : replaces ? (
          'Update my taste'
        ) : (
          'Add to my taste'
        )}
      </button>
      {state?.message ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
