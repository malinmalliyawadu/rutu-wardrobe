import { Suspense } from 'react'

import { Block } from '@/components/ui/skeleton'

import { ShopHead } from '../_components/shop-head'
import { Wishlist } from '../_components/wishlist'

export const metadata = { title: 'Wishlist' }

/**
 * What she wants: every find she saved and anything she pasted a link to,
 * each checked every night for a lower price and her size. She opens it in a
 * shop to decide whether to buy.
 */
export default function WishlistPage() {
  return (
    <>
      <ShopHead title="Wishlist" />
      <Suspense fallback={<WishlistSkeleton />}>
        <Wishlist />
      </Suspense>
    </>
  )
}

function WishlistSkeleton() {
  return (
    <div aria-hidden>
      <div className="max-w-2xl">
        <Block className="mb-2 h-4 w-44" />
        <Block className="h-12 rounded-[var(--radius-control)]" />
      </div>
      <Block className="mt-14 mb-5 h-4 w-72 max-w-full lg:mt-20" />
      <div className="delayed divide-y divide-line sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 sm:divide-y-0 xl:grid-cols-4">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-5 first:pt-0 sm:block sm:py-0 ${row === 3 ? 'sm:hidden xl:block' : ''}`}
          >
            <div className="skeleton aspect-[4/5]" />
            <div className="sm:mt-3">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-2 h-5 w-5/6" />
              <div className="skeleton mt-2 h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
