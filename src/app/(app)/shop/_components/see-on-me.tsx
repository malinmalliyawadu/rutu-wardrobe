'use client'

import { seeItOnMe, seeStatementOutfitOnMe } from '@/app/actions/try-on'
import { TryOn } from '@/components/look/try-on'
import { PiecePicture, ProductPhoto } from '@/components/ui/photos'
import type { FindCard } from '@/lib/feed'
import { list } from '@/lib/format'
import type { WornWith } from '@/lib/statements'
import type { OnMe } from '@/lib/try-on'

import { PriceLine } from './product.tsx'

/*
 * "See it on me" on a find, and "See the outfit on me" on a statement piece
 * with the pieces of hers it wears with. The mirror shows her in it beside
 * the shop's own photo, so the colour is judged against the garment itself.
 */

type Find = Pick<FindCard, 'product_id' | 'title' | 'retailer' | 'url' | 'image' | 'price' | 'on_me'>

const NOTE =
  'Made by OpenAI from your full-length photo and the shop’s photo. Judge the colour against the shop’s photo, and the fit by the size guide: the picture cannot know how this size sits on you.'

export function SeeItOnMe({ find }: { find: Find }) {
  return (
    <TryOn
      initial={find.on_me}
      start={(again) => seeItOnMe(find.product_id, again)}
      content={{
        over: find.retailer,
        title: find.title,
        alt: `You wearing the ${find.title}`,
        aside: <ShopPhoto find={find} />,
        note: NOTE,
        actions: <ShopLink url={find.url} />,
      }}
    />
  )
}

export function SeeOutfitOnMe({ find, pieces, initial }: { find: Find; pieces: WornWith[]; initial: OnMe | null }) {
  const names = pieces.map((piece) => piece.name.toLowerCase())
  return (
    <TryOn
      label="See the outfit on me"
      initial={initial}
      start={(again) =>
        seeStatementOutfitOnMe(
          find.product_id,
          pieces.map((piece) => piece.id),
          again,
        )
      }
      content={{
        over: find.retailer,
        title: find.title,
        alt: `You wearing the ${find.title} with your ${list(names)}`,
        aside: (
          <>
            <ShopPhoto find={find} />
            <figure className="mt-6">
              <ul className="grid grid-cols-4 gap-2">
                {pieces.map((piece) => (
                  <li key={piece.id}>
                    <PiecePicture piece={piece} sizes="5rem" className="block aspect-[3/4] w-full" />
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-ink-2">{piece.name}</span>
                  </li>
                ))}
              </ul>
              <figcaption className="caption mt-2">With your pieces</figcaption>
            </figure>
          </>
        ),
        note: 'Made by OpenAI from your full-length photo, the shop’s photo and your pieces. Judge the colour against the shop’s photo, and the fit by the size guide: the picture cannot know how this size sits on you.',
        actions: <ShopLink url={find.url} />,
      }}
    />
  )
}

function ShopPhoto({ find }: { find: Find }) {
  return (
    <div className="flex items-end gap-5 lg:block">
      <figure className="w-36 shrink-0 lg:w-full">
        <ProductPhoto image={find.image} title={find.title} sizes="(min-width: 1024px) 22rem, 9rem" className="aspect-[4/5]" />
        <figcaption className="caption mt-2">The shop’s photo</figcaption>
      </figure>
      <PriceLine price={find.price} className="min-w-0 pb-7 lg:mt-4 lg:pb-0" />
    </div>
  )
}

function ShopLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link">
      Open the shop
    </a>
  )
}
