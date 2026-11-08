'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { HeartIcon } from '@/components/ui/icons'
import { PiecePicture, ProductPhoto } from '@/components/ui/photos'
import type { FindCard as Find } from '@/lib/feed'
import { DISMISS_REASONS, reasonChips, REASON_LABELS } from '@/lib/reasons'
import type { WornWith } from '@/lib/statements'
import type { OnMe } from '@/lib/try-on'

import { useFindAction } from './find-action.ts'
import { CARD_SIZES, PriceLine, sizeLine } from './product.tsx'
import { SeeItOnMe, SeeOutfitOnMe } from './see-on-me.tsx'

/*
 * One find, as a garment on the white sweep: the shop, its name and price,
 * the stylist's reason in italic, the sizes, then what to do with it. Save
 * sends it to the wishlist; "Not for me" asks why, in four chips; "Bought it"
 * asks once, since it fills the slot and becomes a piece of hers. Whatever
 * she does, the card leaves at once. The photo and the name open the shop.
 */

const REASONS = reasonChips(DISMISS_REASONS, REASON_LABELS)

type Mode = 'actions' | 'dismiss' | 'bought'

export type StatementExtras = { qualities: string; wearsWith: WornWith[]; outfitOnMe: OnMe | null }

export function FindCard({
  find,
  slotName,
  statement = null,
  sizes = CARD_SIZES,
}: {
  find: Find
  /** The plan slot it is for; null for an ask's result or a statement piece. */
  slotName: string | null
  statement?: StatementExtras | null
  sizes?: string
}) {
  const [mode, setMode] = useState<Mode>('actions')
  const { gone, failed, send } = useFindAction()
  const ids = { product_id: find.product_id, slot_id: find.slot_id }
  const sized = sizeLine(find)
  const panel = useRef<HTMLDivElement>(null)

  // The question opens over the photo, before the button in the page's order, so focus moves into it.
  useEffect(() => {
    if (mode !== 'actions') panel.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [mode])

  return (
    <article aria-hidden={gone || undefined} className={`flex min-w-0 flex-col ${gone ? 'leaving' : ''}`}>
      <div className="relative">
        <a href={find.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="pressable lift block">
          <ProductPhoto image={find.image} title={find.title} sizes={sizes} className="aspect-[4/5]" />
        </a>
        {/* Asked over the photo, so the cards beside it do not move. */}
        {mode === 'actions' ? null : (
          <div
            key={mode}
            ref={panel}
            className="crossfade absolute inset-0 flex flex-col justify-end rounded-[var(--radius-tile)] bg-raised/95 p-4 shadow-[inset_0_0_0_1px_var(--line)]"
          >
            {mode === 'dismiss' ? (
              <div role="group" aria-labelledby={`why-${find.product_id}`}>
                <p id={`why-${find.product_id}`} className="title">
                  What is wrong with it?
                </p>
                <p className="mt-1 text-sm text-ink-2">It helps the finder learn what to leave out.</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      className="chip bg-raised"
                      onClick={() => send({ action: 'dismissed', ...ids, reason: reason.value })}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="link mt-1 text-sm text-ink-3" onClick={() => setMode('actions')}>
                  Keep it
                </button>
              </div>
            ) : (
              <div>
                <p className="title">Bought it?</p>
                <p className="mt-1 text-sm text-ink-2">
                  {slotName
                    ? `It fills your ${slotName.toLowerCase()} and goes into your closet.`
                    : 'It goes into your closet as a piece.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button type="button" className="btn btn-primary btn-small" onClick={() => send({ action: 'bought', ...ids })}>
                    Yes, I bought it
                  </button>
                  <button type="button" className="link text-sm text-ink-3" onClick={() => setMode('actions')}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="caption mt-3 flex items-baseline justify-between gap-3">
        <span className="truncate">{find.retailer}</span>
        {statement ? null : <span className="tabular shrink-0">Match {find.score}</span>}
      </p>
      <h3 className="title mt-1 line-clamp-2">
        <a href={find.url} target="_blank" rel="noopener noreferrer" tabIndex={gone ? -1 : 0}>
          {find.title}
        </a>
      </h3>
      <PriceLine price={find.price} className="mt-1.5" />

      {statement?.qualities ? <p className="mt-3 text-sm font-semibold text-accent">{statement.qualities}</p> : null}
      {find.why ? (
        <p className={`voice line-clamp-4 text-[1.0625rem] leading-[1.4] ${statement?.qualities ? 'mt-1' : 'mt-3'}`}>
          {find.why}
        </p>
      ) : null}
      {statement && statement.wearsWith.length > 0 ? <WearsWith pieces={statement.wearsWith} /> : null}

      {sized || find.colour_option ? (
        <p className="caption mt-3">
          {sized}
          {sized && find.colour_option ? ', ' : null}
          {find.colour_option ? (sized ? `in ${find.colour_option}` : find.colour_option) : null}
        </p>
      ) : null}
      {find.try_on ? <p className="caption mt-1">Try it on at {find.try_on}</p> : null}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-quiet" onClick={() => send({ action: 'saved', ...ids })}>
            <HeartIcon className="size-[1.125rem]" />
            Save
          </button>
          {statement && statement.wearsWith.length > 0 ? (
            <SeeOutfitOnMe find={find} pieces={statement.wearsWith} initial={statement.outfitOnMe} />
          ) : (
            <SeeItOnMe find={find} />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-5">
          <button
            type="button"
            className="link text-sm"
            aria-pressed={mode === 'bought'}
            onClick={() => setMode(mode === 'bought' ? 'actions' : 'bought')}
          >
            Bought it
          </button>
          <button
            type="button"
            className="link text-sm text-ink-3"
            aria-pressed={mode === 'dismiss'}
            onClick={() => setMode(mode === 'dismiss' ? 'actions' : 'dismiss')}
          >
            Not for me
          </button>
        </div>
        {failed ? (
          <p role="alert" className="text-sm text-alert">
            That did not save. Try again.
          </p>
        ) : null}
      </div>
    </article>
  )
}

/** The pieces of hers it wears with, small, each a tap to the piece. */
function WearsWith({ pieces }: { pieces: WornWith[] }) {
  return (
    <div className="mt-4">
      <p className="caption">Wear it with your</p>
      <ul className="mt-2 flex gap-2">
        {pieces.slice(0, 4).map((piece) => (
          <li key={piece.id} className="w-12">
            <Link href={`/closet/${piece.id}`} title={piece.name} className="pressable block">
              <PiecePicture piece={piece} sizes="3rem" className="block aspect-[3/4] w-full" />
              <span className="sr-only">{piece.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
