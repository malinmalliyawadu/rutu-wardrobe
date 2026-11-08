'use client'

import Link from 'next/link'
import { useOptimistic, useRef, useState, useTransition, type ReactNode } from 'react'

import { turnTo } from '@/app/actions/day'
import { ChangePieces } from '@/components/look/change-pieces'
import { LookActions } from '@/components/look/look-actions'
import { LookPicture, LookThumb } from '@/components/look/look-picture'
import { LookOnMe } from '@/components/look/try-on'
import { PiecePicture } from '@/components/ui/photos'
import type { LookImage } from '@/lib/look-image'
import type { Look } from '@/lib/looks'

/*
 * The day's outfit as a spread: the mirror on the left, and beside it the
 * day, the look's name set large, what it is for today, why it suits her, the
 * stylist's line in italic, the pieces, and "Wear this". The other options
 * sit underneath as small arches; a tap turns the spread to one at once and
 * tells the server behind, so every device opens on the same one and it gets
 * its picture drawn. The new option crossfades in place.
 */

export type SpreadOption = { look: Look; today: string; occasion: string; image: LookImage | null }

export function Spread({
  dayId,
  head,
  options,
  shown,
  today,
  isToday,
  canDraw,
  compact = false,
}: {
  dayId: number
  head?: ReactNode
  options: SpreadOption[]
  shown: number
  today: string
  isToday: boolean
  canDraw: boolean
  /** The gym fit: no date line, a smaller picture. */
  compact?: boolean
}) {
  const [index, setIndex] = useOptimistic(shown)
  const [changingId, setChangingId] = useState<number | null>(null)
  /** Only an option she turned to crossfades in; the first one is simply there. */
  const [turned, setTurned] = useState(false)
  const [, startTransition] = useTransition()
  const top = useRef<HTMLDivElement>(null)
  const option = options[index % options.length]!
  const others = options.map((other, position) => ({ ...other, position })).filter((other) => other.position !== index)
  const whole = option.look.pieces.length === option.look.piece_count
  const changing = changingId === option.look.id || option.look.remaking !== null

  function turn(next: number) {
    if (next === index) return
    setTurned(true)
    startTransition(async () => {
      setIndex(next)
      await turnTo(dayId, next)
    })
    top.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }

  return (
    <div ref={top} className="scroll-mt-4">
      <article
        key={option.look.id}
        aria-roledescription="outfit"
        aria-label={option.look.title}
        className={`${turned ? 'crossfade' : ''} grid gap-8 ${compact ? 'lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]'} lg:items-start lg:gap-16`}
      >
        <div className="lg:sticky lg:top-6">
          <LookPicture look={option.look} image={option.image} canDraw={canDraw} priority={!compact} />
        </div>

        <div className="min-w-0 lg:pt-10">
          {head}
          <p className={`caption ${head ? 'mt-8' : ''}`}>
            {option.occasion}, {option.look.weather.toLowerCase()}
          </p>
          <h1 className={compact ? 'headline mt-2' : 'display mt-3'}>{option.look.title}</h1>
          <p className="prose-measure mt-6 text-lg">{option.today}</p>
          <p className="prose-measure mt-3 text-ink-2">{option.look.why}</p>
          {option.look.styling ? <p className="voice prose-measure mt-5">{option.look.styling}</p> : null}

          {changing ? (
            <div className="mt-6 max-w-xl">
              <ChangePieces look={option.look} onClose={() => setChangingId(null)} />
            </div>
          ) : (
            <>
              <div className="mt-8">
                <ul className="-mx-[var(--gutter)] flex gap-3 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="The pieces">
                  {option.look.pieces.map((piece) => (
                    <li key={piece.id} className="shrink-0">
                      <Link href={`/closet/${piece.id}`} className="pressable block w-20" title={piece.name}>
                        <PiecePicture piece={piece} sizes="5rem" className="aspect-[3/4]" />
                        <span className="mt-1.5 line-clamp-2 block text-xs leading-snug text-ink-2">{piece.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {whole ? (
                  <button type="button" className="link mt-1 text-sm" onClick={() => setChangingId(option.look.id)}>
                    Change pieces
                  </button>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
                <LookActions key={`actions-${option.look.id}`} look={option.look} today={today} canWear={isToday} />
                {whole ? <LookOnMe key={`on-me-${option.look.id}`} look={option.look} occasion={option.occasion} /> : null}
              </div>
            </>
          )}

          {others.length > 0 ? (
            <div className="mt-14" role="group" aria-label="The other options">
              <p className="caption">Or, for the same day</p>
              <ul className="mt-4 grid max-w-md grid-cols-2 gap-5">
                {others.map((other) => (
                  <li key={other.look.id}>
                    <button type="button" onClick={() => turn(other.position)} className="pressable lift block w-full text-left">
                      <span className="block overflow-hidden rounded-[999px_999px_0.625rem_0.625rem]">
                        <LookThumb look={other.look} image={other.image} />
                      </span>
                      <span className="title mt-3 block">{other.look.title}</span>
                      <span className="caption mt-0.5 block">{other.occasion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}
