'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'

import { lookAction } from '@/app/actions/look'
import { ChangePieces } from '@/components/look/change-pieces'
import { LookPicture } from '@/components/look/look-picture'
import { LookOnMe } from '@/components/look/try-on'
import { CheckIcon, HeartIcon } from '@/components/ui/icons'
import { PiecePicture } from '@/components/ui/photos'
import { Swatch } from '@/components/ui/swatch'
import type { LookImage } from '@/lib/look-image'
import type { Look, LookAction } from '@/lib/looks'
import { LOOK_DISMISS_REASONS, LOOK_REASON_LABELS, reasonChips } from '@/lib/reasons'

/*
 * One look as a lookbook page: the outfit in the arch, the occasion and the
 * weather, its name, why it works, the stylist's line on how to wear it, and
 * its pieces small underneath, each a way to the piece. Save and "Wore it
 * today" show at once and are saved behind; Dismiss asks why, then the card
 * fades and the next render drops it. In a grid of looks every action is
 * quiet: the page's one solid button is the one that makes more.
 */

type Shown = { saved: boolean; woreToday: boolean }

export const REASONS = reasonChips(LOOK_DISMISS_REASONS, LOOK_REASON_LABELS)

export function LookCard({
  look,
  image,
  today,
  occasion,
  wornLine,
  canDraw,
  wide = false,
  asked,
}: {
  look: Look
  image: LookImage | null
  /** Today in New Zealand, YYYY-MM-DD. */
  today: string
  occasion: string
  /** "Offered 4 times, 2 on Today. Worn twice, last on 2 November.", formatted on the server. */
  wornLine: string | null
  canDraw: boolean
  /** Alone on its page, as a spread: the arch on the left, the words beside it. */
  wide?: boolean
  /** What she asked for, over the name, when she asked for this one. */
  asked?: string
}) {
  const [changing, setChanging] = useState(false)
  const [gone, setGone] = useState(false)
  const missing = look.piece_count - look.pieces.length
  const aside = look.pieces.some((piece) => piece.set_aside_at)
  const whole = missing === 0
  const open = changing || look.remaking !== null

  return (
    <article
      aria-label={look.title}
      aria-hidden={gone || undefined}
      className={`${wide ? 'grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start lg:gap-16' : 'flex flex-col'} ${gone ? 'leaving' : ''}`}
    >
      <div className={wide ? 'lg:sticky lg:top-6' : undefined}>
        <LookPicture
          look={look}
          image={image}
          canDraw={canDraw}
          sizes={wide ? undefined : '(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 100vw'}
          priority={wide}
        />
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${wide ? 'lg:pt-10' : ''}`}>
        {asked ? <p className="caption mb-3">{asked}</p> : null}
        {wide ? <h1 className="display">{look.title}</h1> : null}
        <p className={`caption ${wide ? 'mt-4' : 'mt-5'}`}>
          {occasion}, {look.weather.toLowerCase()}
        </p>
        {wide ? null : <h3 className="headline mt-2">{look.title}</h3>}
        <p className={wide ? 'prose-measure mt-4 text-lg' : 'mt-3 text-ink-2'}>{look.why}</p>
        {look.styling ? <p className={`voice ${wide ? 'prose-measure mt-5' : 'mt-3'}`}>{look.styling}</p> : null}

        {open ? (
          <div className="mt-5">
            <ChangePieces look={look} onClose={() => setChanging(false)} />
          </div>
        ) : (
          <div className="mt-6">
            <ul className="flex flex-wrap gap-2" aria-label="The pieces">
              {look.pieces.map((piece) => (
                <li key={piece.id}>
                  <Link href={`/closet/${piece.id}`} title={piece.name} className="pressable block">
                    <PiecePicture
                      piece={piece}
                      sizes="3.5rem"
                      className={`block aspect-[3/4] w-14 ${piece.set_aside_at ? 'opacity-45' : ''}`}
                    />
                    <span className="sr-only">{piece.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {missing > 0 || aside ? (
              <p className="mt-2 text-sm text-alert">
                {missing > 0
                  ? `${missing === 1 ? 'A piece' : `${missing} pieces`} of this look ${missing === 1 ? 'is' : 'are'} no longer in your closet.`
                  : 'Part of this look is set aside.'}
              </p>
            ) : null}
            {whole ? (
              <button type="button" className="link text-sm" onClick={() => setChanging(true)}>
                Change pieces
              </button>
            ) : null}
          </div>
        )}

        {look.better && !open ? (
          <Link href={`/style/plan/${look.better.slot_id}`} className="pressable mt-3 flex items-center gap-3 py-1">
            <span className="flex shrink-0 gap-0.5">
              {look.better.colours.slice(0, 3).map((hex, index) => (
                <Swatch key={`${index}-${hex}`} hex={hex} name={look.better?.colour_names[index]} className="h-8 w-5 rounded-[0.25rem]" />
              ))}
            </span>
            <span className="min-w-0 text-sm leading-snug">
              <span className="text-ink-2">Even better with the </span>
              <span className="font-semibold text-accent">{look.better.name.toLowerCase()}</span>
              <span className="text-ink-2"> in your plan.</span>
              {look.better.why ? <span className="mt-0.5 block text-ink-3">{look.better.why}</span> : null}
            </span>
          </Link>
        ) : null}

        {wornLine ? <p className="caption mt-4">{wornLine}</p> : null}

        <div className="mt-auto pt-6" hidden={open}>
          <CardActions look={look} today={today} onDismissed={() => setGone(true)} onFailed={() => setGone(false)} />
          {whole ? (
            <div className="mt-4">
              <LookOnMe look={look} occasion={occasion} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

/** Save, "Wore it today", and Dismiss with a reason; all quiet, all shown at once. */
function CardActions({ look, today, onDismissed, onFailed }: { look: Look; today: string; onDismissed: () => void; onFailed: () => void }) {
  const [asking, setAsking] = useState(false)
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useOptimistic<Shown>({ saved: look.status === 'saved', woreToday: look.worn[0] === today })
  const [, startTransition] = useTransition()

  function send(input: LookAction, next?: Shown) {
    setFailed(false)
    startTransition(async () => {
      if (next) setShown(next)
      const result = await lookAction(input)
      if (!result.ok) {
        setFailed(true)
        onFailed()
      }
    })
  }

  return (
    <div>
      {asking ? (
        <div key="ask" role="group" aria-label="Why dismiss it?" className="crossfade">
          <p className="caption mb-2">What was wrong with it?</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                className="chip"
                onClick={() => {
                  onDismissed()
                  send({ action: 'dismiss', look_id: look.id, reason: reason.value })
                }}
              >
                {reason.label}
              </button>
            ))}
          </div>
          <button type="button" className="link mt-1 text-sm text-ink-2" onClick={() => setAsking(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <div key="act" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={shown.saved}
            aria-label={shown.saved ? 'Saved to your looks' : 'Save to your looks'}
            className="btn btn-quiet btn-small"
            onClick={() => send({ action: shown.saved ? 'unsave' : 'save', look_id: look.id }, { ...shown, saved: !shown.saved })}
          >
            <HeartIcon filled={shown.saved} className={`size-[1.125rem] ${shown.saved ? 'text-accent' : ''}`} />
            {shown.saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            aria-pressed={shown.woreToday}
            className="btn btn-quiet btn-small"
            onClick={() =>
              send(
                { action: shown.woreToday ? 'unwore' : 'wore', look_id: look.id },
                { saved: shown.woreToday ? shown.saved : true, woreToday: !shown.woreToday },
              )
            }
          >
            {shown.woreToday ? <CheckIcon className="size-[1.125rem] text-accent" /> : null}
            {shown.woreToday ? 'Wearing it today' : 'Wore it today'}
          </button>
          {shown.saved ? null : (
            <button type="button" className="link ml-auto px-1 text-sm text-ink-2" onClick={() => setAsking(true)}>
              Dismiss
            </button>
          )}
        </div>
      )}
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          That did not save. Try again.
        </p>
      ) : null}
    </div>
  )
}
