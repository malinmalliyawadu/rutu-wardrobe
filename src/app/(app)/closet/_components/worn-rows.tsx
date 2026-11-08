'use client'

import Link from 'next/link'
import { useState, useTransition, type ReactNode } from 'react'

import { lookAction } from '@/app/actions/look'
import { PiecePicture } from '@/components/ui/photos'
import type { LookImage } from '@/lib/look-image'
import type { Look } from '@/lib/looks'
import type { Piece } from '@/lib/pieces'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { setAsideRow } from '../actions.ts'
import { REASONS } from './look-card.tsx'

/*
 * The Worn page's rows: a look or a piece, how often it was offered and
 * worn, and the one way to let it go. Dismiss asks why, as a look card does;
 * Set aside asks what becomes of the piece's plan slot, as its page does.
 * Either way the row fades at once and the next render drops it; if the
 * action fails it comes back with a line saying so.
 */

function Row({ gone, picture, children }: { gone: boolean; picture: ReactNode; children: ReactNode }) {
  return (
    <li aria-hidden={gone || undefined} className={`flex gap-4 border-b border-line py-5 sm:gap-5 ${gone ? 'leaving' : ''}`}>
      <div className="shrink-0">{picture}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

/** Ask, then act: the word that opens a row's choices, the choices, and "Keep it". */
function LetGo({
  label,
  question,
  hint,
  choices,
  onChoose,
  failed,
}: {
  label: string
  question: string
  hint?: string
  choices: { value: string; label: string }[]
  onChoose: (value: string) => void
  failed: boolean
}) {
  const [asking, setAsking] = useState(false)
  return (
    <div className="mt-1">
      {asking ? (
        <div key="ask" role="group" aria-label={question} className="crossfade pt-2">
          {hint ? <p className="caption mb-2">{hint}</p> : null}
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button key={choice.value} type="button" className="chip" onClick={() => onChoose(choice.value)}>
                {choice.label}
              </button>
            ))}
          </div>
          <button type="button" className="link text-sm text-ink-2" onClick={() => setAsking(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <button key="act" type="button" className="link text-sm" onClick={() => setAsking(true)}>
          {label}
        </button>
      )}
      {failed ? <p className="text-sm text-alert">That did not save. Try again.</p> : null}
    </div>
  )
}

/** A look: small in its arch, its name, how it has done, and Dismiss. */
export function WornLook({ look, image, occasion, line }: { look: Look; image: LookImage | null; occasion: string; line: string }) {
  const [gone, setGone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [, startTransition] = useTransition()
  const partial = look.pieces.some((piece) => piece.set_aside_at) || look.pieces.length < look.piece_count

  return (
    <Row
      gone={gone}
      picture={
        <span className="block w-16 sm:w-20">
          <LookMini look={look} image={image} />
        </span>
      }
    >
      <p className="caption">
        {occasion}
        {partial ? ', part of it no longer in your closet' : ''}
      </p>
      <h3 className="title mt-1">{look.title}</h3>
      <p className="mt-1 text-sm leading-snug text-ink-2">{line}</p>
      <LetGo
        label="Dismiss"
        question="Why dismiss it?"
        hint="What was wrong with it?"
        choices={REASONS}
        failed={failed}
        onChoose={(reason) => {
          setGone(true)
          setFailed(false)
          startTransition(async () => {
            const result = await lookAction({ action: 'dismiss', look_id: look.id, reason: reason as (typeof REASONS)[number]['value'] })
            if (!result.ok) {
              setGone(false)
              setFailed(true)
            }
          })
        }}
      />
    </Row>
  )
}

/**
 * A look small, in its arch: its drawn picture once there is one, else its
 * first pieces standing side by side on the sweep, clear of the arch's curve.
 */
function LookMini({ look, image }: { look: Look; image: LookImage | null }) {
  if (image?.status === 'ready' && image.width && image.height) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a private, already-sized file; the optimiser would only copy it
      <img
        src={`/photos/looks/${image.id}`}
        alt=""
        width={image.width}
        height={image.height}
        loading="lazy"
        className="block aspect-[4/5] w-full rounded-[999px_999px_0.5rem_0.5rem] bg-photo object-cover"
      />
    )
  }
  return (
    <span aria-hidden className="arch flex aspect-[4/5] w-full gap-[3px] rounded-[999px_999px_0.5rem_0.5rem] px-[14%] pt-[34%] pb-[12%]">
      {look.pieces.slice(0, 3).map((piece) => (
        <PiecePicture key={piece.id} piece={piece} sizes="2rem" className="block min-w-0 flex-1 rounded-[0.1875rem]!" />
      ))}
    </span>
  )
}

/** A piece: its picture, its name, how it has done, and Set aside. */
export function WornPiece({ piece, colour, line }: { piece: Piece; colour: string | null; line: string }) {
  const [gone, setGone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [, startTransition] = useTransition()
  const slot = piece.slot_id && piece.slot_name ? piece.slot_name.toLowerCase() : null

  return (
    <Row
      gone={gone}
      picture={
        <Link href={`/closet/${piece.id}`} className="pressable block" tabIndex={-1} aria-hidden>
          <PiecePicture piece={{ ...piece, colour_name: colour }} sizes="5rem" className="block aspect-[3/4] w-16 sm:w-20" />
        </Link>
      }
    >
      <p className="caption">{GARMENT_LABELS[piece.garment_type]}</p>
      <h3 className="title mt-1">
        <Link href={`/closet/${piece.id}`} className="decoration-line-strong underline-offset-[3px] hover:underline">
          {piece.name}
        </Link>
      </h3>
      <p className="mt-1 text-sm leading-snug text-ink-2">{line}</p>
      <LetGo
        label="Set aside"
        question="Set it aside?"
        hint={slot ? `It fills your ${slot} slot.` : 'Looks will leave it out. It stays on record.'}
        choices={
          slot
            ? [
                { value: 'wanted', label: 'Set aside, find another' },
                { value: 'retired', label: 'Set aside, retire the slot' },
              ]
            : [{ value: 'wanted', label: 'Set it aside' }]
        }
        failed={failed}
        onChoose={(slotTo) => {
          setGone(true)
          setFailed(false)
          startTransition(async () => {
            const result = await setAsideRow({ piece_id: piece.id, slot_to: slotTo === 'retired' ? 'retired' : 'wanted' })
            if (!result.ok) {
              setGone(false)
              setFailed(true)
            }
          })
        }}
      />
    </Row>
  )
}
