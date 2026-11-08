import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { HeartIcon } from '@/components/ui/icons'
import { Empty } from '@/components/ui/layout'
import { ProductPhoto } from '@/components/ui/photos'
import { TileGrid } from '@/components/ui/skeleton'
import { listSlots, type Slot } from '@/lib/blueprint'
import { db } from '@/lib/db'
import { CARDS_PER_SLOT, REASON_LABELS } from '@/lib/feed'
import { OPEN_STATUSES } from '@/lib/finder/filter'
import { SHOW_THRESHOLD } from '@/lib/finder/score'
import { listRetailers } from '@/lib/retailers'
import { parseShopQuery, shopQueryString, type ShopQuery } from '@/lib/shop-query'
import { defaultSlot, searchShops, type ShopPage, type ShopPiece } from '@/lib/shops'
import { GARMENT_LABELS, GARMENT_TYPES } from '@/lib/wardrobe-values'

import { BrowseForm } from '../_components/browse-form'
import { PriceLine, sizeLine } from '../_components/product'
import { SaveChoice } from '../_components/save-choice'
import { ShopHead } from '../_components/shop-head'

export const metadata = { title: 'All shops' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Everything the finder read in the shops she has on, not only what made New:
 * searchable by words, kind, shop and her size, with what the finder made of
 * each piece. What she saves here goes to her wishlist.
 */
export default function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ShopHead title="All shops" line="Everything the finder read last night, including what it passed over." />
      <Suspense fallback={<BrowseSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  await connection()
  const query = parseShopQuery(await searchParams)
  const [slots, retailers] = await Promise.all([listSlots(), listRetailers(db())])
  const open = slots.filter((slot) => (OPEN_STATUSES as readonly string[]).includes(slot.status))
  const result = await searchShops(query)
  // An old link past the end, after the catalogue shrank: the last page instead.
  if (result.pages > 0 && result.page > result.pages) redirect(`/shop/browse${shopQueryString(query, result.pages)}` as never)
  const byId = new Map(slots.map((slot) => [slot.id, slot]))

  if (!result.read) {
    return (
      <Empty
        title="Nothing read yet"
        line="Every night the finder reads the shops you have on. Once it has, everything they had is here to search, in your size."
      />
    )
  }

  return (
    <BrowseForm
      query={query}
      kinds={GARMENT_TYPES.map((garment) => ({ value: garment, label: GARMENT_LABELS[garment] }))}
      shops={retailers.filter((retailer) => retailer.enabled).map((retailer) => ({ value: retailer.slug, label: retailer.name }))}
      page={result.page}
      pages={result.pages}
      previousHref={result.page > 1 ? `/shop/browse${shopQueryString(query, result.page - 1)}` : null}
      nextHref={result.page < result.pages ? `/shop/browse${shopQueryString(query, result.page + 1)}` : null}
    >
      {result.pieces.length > 0 ? (
        <>
          <p className="caption mt-10 mb-5">{summary(result, query)}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
            {result.pieces.map((piece) => (
              <Tile key={piece.product_id} piece={piece} slots={byId} open={open} />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-14">
          <p className="headline">Nothing matches</p>
          <p className="prose-measure mt-3 text-ink-2">
            {query.q ? 'Try fewer words, or another spelling' : 'Try another kind or shop'}
            {query.size === 'mine' ? ', or every size.' : '.'}
          </p>
        </div>
      )}
    </BrowseForm>
  )
}

function summary(result: ShopPage, query: ShopQuery): string {
  const count = `${result.total.toLocaleString('en-NZ')} ${result.total === 1 ? 'piece' : 'pieces'}`
  const words = query.q ? ` for “${query.q}”` : ''
  const size = query.size === 'mine' ? ' in your size' : ''
  const order = { closest: 'closest to your plan first', newest: 'newest first', price: 'cheapest first' }[query.sort]
  return `${count}${words}${size}, ${order}.`
}

/** What the finder made of it, or what she did with it, in a few words. */
function verdict(piece: ShopPiece, slots: Map<number, Slot>): { text: string; tone: 'accent' | 'quiet' } | null {
  const yours = (slotId: number | null) => {
    const slot = slotId === null ? null : slots.get(slotId)
    return slot ? `your ${slot.name.toLowerCase()}` : null
  }
  if (piece.action?.kind === 'saved') {
    const slot = yours(piece.action.slot_id)
    return { text: slot ? `On your wishlist, for ${slot}` : 'On your wishlist', tone: 'accent' }
  }
  if (piece.action?.kind === 'bought') return { text: 'You bought it', tone: 'quiet' }
  if (piece.action?.kind === 'dismissed') {
    const reason = piece.action.reason ? REASON_LABELS[piece.action.reason].toLowerCase() : null
    return { text: reason ? `You passed on it: ${reason}` : 'You passed on it', tone: 'quiet' }
  }
  if (piece.judged) {
    const { score, slot_id } = piece.judged
    if (piece.on_today) return { text: `On New, match ${score}`, tone: 'accent' }
    const slot = slot_id === null ? null : slots.get(slot_id)
    if (!slot) return { text: slot_id === null ? `Match ${score}, for nothing in your plan` : `Match ${score}`, tone: 'quiet' }
    const match = `Match ${score} for ${yours(slot.id)}`
    if (slot.status === 'owned') return { text: `${match}, which you own`, tone: 'quiet' }
    if (slot.status === 'retired') return { text: `${match}, no longer in your plan`, tone: 'quiet' }
    // It clears the bar, but New shows only each slot's best few.
    if (score >= SHOW_THRESHOLD && piece.shortlisted)
      return { text: `${match}, just behind the best ${CARDS_PER_SLOT}`, tone: 'quiet' }
    return { text: match, tone: 'quiet' }
  }
  if (piece.shortlisted) return { text: 'Shortlisted, not judged yet', tone: 'quiet' }
  return null
}

function Tile({ piece, slots, open }: { piece: ShopPiece; slots: Map<number, Slot>; open: Slot[] }) {
  const line = verdict(piece, slots)
  const kept = piece.action?.kind === 'saved' || piece.action?.kind === 'bought'
  const sameKind = open.filter((slot) => slot.garment_type === piece.garment_type)
  const others = open.filter((slot) => slot.garment_type !== piece.garment_type)
  const option = (slot: Slot) => ({ id: slot.id, name: slot.name })
  const sized = sizeLine(piece)

  return (
    <li className="relative flex min-w-0 flex-col">
      <a href={piece.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="pressable lift block">
        <ProductPhoto
          image={piece.image}
          title={piece.title}
          sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 26vw, 45vw"
          className="aspect-[4/5]"
        />
      </a>
      <p className="caption mt-3 truncate">{piece.retailer}</p>
      <h2 className="title mt-1 line-clamp-2">
        <a href={piece.url} target="_blank" rel="noopener noreferrer">
          {piece.title}
        </a>
      </h2>
      <PriceLine price={piece.price} className="mt-1.5" />
      {line ? (
        <p
          className={`mt-2 flex items-center gap-1.5 text-sm ${line.tone === 'accent' ? 'font-semibold text-accent' : 'text-ink-3'}`}
        >
          {piece.action?.kind === 'saved' ? <HeartIcon filled className="size-4 shrink-0" /> : null}
          {line.text}
        </p>
      ) : null}
      {piece.judged?.why ? <p className="voice mt-2 line-clamp-3 text-base leading-snug">{piece.judged.why}</p> : null}
      {sized ? <p className="caption mt-2">{sized}</p> : null}
      {piece.try_on ? <p className="caption mt-1">Try it on at {piece.try_on}</p> : null}
      {kept ? null : (
        <div className="mt-auto pt-4">
          <SaveChoice
            productId={piece.product_id}
            title={piece.title}
            defaultSlotId={defaultSlot(piece, open)}
            sameKind={sameKind.map(option)}
            others={others.map(option)}
            again={piece.action?.kind === 'dismissed'}
          />
        </div>
      )}
    </li>
  )
}

function BrowseSkeleton() {
  return (
    <div aria-hidden>
      <div className="delayed grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <div className="skeleton h-12 rounded-[var(--radius-control)]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">
          {[0, 1, 2, 3].map((select) => (
            <div key={select} className="skeleton h-12 rounded-[var(--radius-control)]" />
          ))}
        </div>
      </div>
      <div className="delayed skeleton mt-10 mb-5 h-4 w-64 max-w-full" />
      <TileGrid count={8} />
    </div>
  )
}
