'use client'

import { useState } from 'react'

import { ProductPhoto } from '@/components/ui/photos'
import type { SavedFind as Saved } from '@/lib/feed'

import { useFindAction } from './find-action.ts'
import { PhotoChoice } from '@/components/ui/photo-choice'
import { PriceLine, sizeLine } from './product.tsx'
import type { ChangeLine } from './saved-change.ts'
import { SeeItOnMe } from './see-on-me.tsx'

/*
 * One thing on her wishlist. On the phone a row, the photo beside the words,
 * so a long list reads at a glance in a shop; from sm up a tile on the sweep,
 * like every other find. What changed since she saved it sits under the
 * price, rose when it is good news. Bought it asks once, Change photo opens
 * the row of photos in place, Remove takes it off at once.
 */

type Mode = 'actions' | 'bought' | 'photo'

export function SavedFind({ find, slotName, change }: { find: Saved; slotName: string | null; change: ChangeLine | null }) {
  const [mode, setMode] = useState<Mode>('actions')
  const { gone, failed, send } = useFindAction()
  const ids = { product_id: find.product_id, slot_id: find.slot_id }
  const details = find.inStock
    ? [
        find.colour,
        find.yourSizeOut ? `Your ${find.yourSizeOut} is sold out` : null,
        find.sizes.length === 0 ? null : find.byHand ? `Your size ${find.sizes.join(', ')}` : sizeLine(find),
      ].filter((part): part is string => Boolean(part))
    : []

  return (
    <li
      aria-hidden={gone || undefined}
      className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-5 first:pt-0 sm:flex sm:flex-col sm:gap-0 sm:py-0 ${gone ? 'leaving' : ''}`}
    >
      <a
        href={find.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden
        className="pressable lift block self-start sm:self-auto"
      >
        <ProductPhoto
          image={find.image}
          title={find.title}
          sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 26vw, (min-width: 640px) 30vw, 5.5rem"
          className={`aspect-[4/5] ${find.inStock ? '' : '[&_img]:opacity-55'}`}
        />
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="caption truncate sm:mt-3">
          {slotName ? `${find.retailer}, for your ${slotName.toLowerCase()}` : find.retailer}
        </p>
        <h3 className="title mt-1 line-clamp-2">
          <a href={find.url} target="_blank" rel="noopener noreferrer" tabIndex={gone ? -1 : 0}>
            {find.title}
          </a>
        </h3>

        {find.inStock ? (
          <PriceLine price={find.price} className="mt-1.5" />
        ) : (
          // Out of stock, the change line is the whole story: when it sold out.
          <p className="mt-1.5 text-ink-3">{change?.text ?? 'Not in your size right now'}</p>
        )}
        {change && find.inStock ? (
          <p className={`mt-1 text-sm ${change.tone === 'good' ? 'font-semibold text-accent' : 'text-ink-3'}`}>{change.text}</p>
        ) : null}
        {details.length > 0 ? <p className="caption mt-2">{details.join('. ')}</p> : null}
        {find.byHand ? <p className="caption mt-1">Added by hand, so its price is not checked</p> : null}
        {find.try_on && find.inStock ? <p className="caption mt-1">Try it on at {find.try_on}</p> : null}

        <div className="mt-auto pt-3">
          <div key={mode} className={mode === 'actions' ? undefined : 'crossfade'}>
            {mode === 'actions' ? (
              <div className="flex flex-wrap items-center gap-x-3 max-sm:[&>button]:text-[0.8125rem] sm:gap-x-4">
                <button type="button" className="link text-sm" onClick={() => setMode('bought')}>
                  Bought it
                </button>
                <button type="button" className="link text-sm text-ink-2" onClick={() => setMode('photo')}>
                  Change photo
                </button>
                <button type="button" className="link text-sm text-ink-3" onClick={() => send({ action: 'cleared', ...ids })}>
                  Remove
                </button>
              </div>
            ) : mode === 'photo' ? (
              <div className="pt-1">
                <PhotoChoice productId={find.product_id} photos={find.photos} shown={find.image?.src ?? null} />
                <button type="button" className="link text-sm" onClick={() => setMode('actions')}>
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p className="pt-2 text-sm text-ink-2">
                  {slotName
                    ? `It fills your ${slotName.toLowerCase()} and goes into your closet.`
                    : 'It goes into your closet as a piece.'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4">
                  <button type="button" className="link text-sm" onClick={() => send({ action: 'bought', ...ids })}>
                    Yes, I bought it
                  </button>
                  <button type="button" className="link text-sm text-ink-3" onClick={() => setMode('actions')}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {failed ? (
            <p role="alert" className="text-sm text-alert">
              That did not save. Try again.
            </p>
          ) : null}
          {find.inStock ? (
            <div className="mt-2">
              <SeeItOnMe find={find} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}
