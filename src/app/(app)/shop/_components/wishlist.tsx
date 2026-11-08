import { connection } from 'next/server'

import { Section } from '@/components/ui/layout'
import { db } from '@/lib/db'
import { whenSaid } from '@/lib/format'
import { getWishlist, type SavedFind as Saved, type Wishlist as WishlistData } from '@/lib/feed'
import { listRetailers, readable, type Retailer } from '@/lib/retailers'

import { AddLink, type ManualStore } from './add-link.tsx'
import { changeLine } from './saved-change.ts'
import { SavedFind } from './saved-find.tsx'

/**
 * The wishlist: the line to paste a link first, since that is what she comes
 * here to do from a shop; then what changed overnight, if anything did; then
 * everything else she saved, newest first.
 */
export async function Wishlist() {
  await connection()
  const [list, retailers] = await Promise.all([getWishlist(), listRetailers(db())])
  const now = new Date()
  const since = list.run ? whenSaid(list.run.started_at, now) : null
  const changed = list.saved.filter((find) => find.news !== null)
  const rest = list.saved.filter((find) => find.news === null)
  const count = list.saved.length

  return (
    <div>
      <div className="max-w-2xl">
        <AddLink slots={list.openSlots} manualStores={manualStores(retailers)} />
      </div>

      {count === 0 ? (
        <div className="mt-14 lg:mt-20">
          <p className="headline">Nothing saved yet</p>
          <p className="prose-measure mt-3 text-ink-2">
            Save a find, or paste a link to anything you want from the shops, and it waits here. Every night it is checked for a
            lower price, and for your size coming back.
          </p>
        </div>
      ) : (
        <>
          {changed.length > 0 ? (
            <Section title="What changed" aside={since ? since.charAt(0).toUpperCase() + since.slice(1) : null}>
              <Finds finds={changed} list={list} now={now} />
            </Section>
          ) : null}
          {changed.length > 0 && rest.length > 0 ? (
            <Section title="Everything else" aside={pieces(rest.length)}>
              <Finds finds={rest} list={list} now={now} />
            </Section>
          ) : changed.length === 0 ? (
            <div className="mt-14 lg:mt-20">
              <p className="caption mb-5">{pieces(count)}, each checked every night for a lower price and your size.</p>
              <Finds finds={rest} list={list} now={now} />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

const pieces = (count: number) => `${count} ${count === 1 ? 'piece' : 'pieces'}`

function Finds({ finds, list, now }: { finds: Saved[]; list: WishlistData; now: Date }) {
  return (
    <ul className="divide-y divide-line sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 sm:divide-y-0 xl:grid-cols-4">
      {finds.map((find) => (
        <SavedFind
          key={find.product_id}
          find={find}
          slotName={find.slot_id === null ? null : (list.slotNames[find.slot_id] ?? null)}
          change={changeLine(find, now)}
        />
      ))}
    </ul>
  )
}

/** The shops whose links open the by-hand fields, with the hosts a link from each is on. */
function manualStores(retailers: Retailer[]): ManualStore[] {
  return retailers
    .filter((retailer) => !readable(retailer))
    .map((retailer) => ({
      name: retailer.name,
      currency: retailer.currency,
      hosts: [retailer.base_url, retailer.feed_url]
        .filter((origin): origin is string => Boolean(origin))
        .map((origin) => new URL(origin).host.toLowerCase().replace(/^www\./, '')),
    }))
}
