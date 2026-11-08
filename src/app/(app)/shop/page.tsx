import Link from 'next/link'
import { Suspense } from 'react'

import { Block, Lines } from '@/components/ui/skeleton'

import { AskForm } from './_components/ask-form'
import { NewFinds } from './_components/new-finds'
import { ShopHead } from './_components/shop-head'

export const metadata = { title: 'New in' }

/**
 * New: what the finder brought back overnight, by the piece in her plan each
 * is for, under a line to ask the shops for anything else.
 */
export default function NewPage() {
  return (
    <>
      <ShopHead title="New in" />
      <div className="mb-12 lg:mb-16">
        <AskForm
          id="new-ask"
          label="Looking for something?"
          aside={
            <Link href="/shop/ask" className="pressable -my-3 py-3 text-sm font-semibold text-accent">
              Your asks
            </Link>
          }
        />
      </div>
      <Suspense fallback={<NewSkeleton />}>
        <NewFinds />
      </Suspense>
    </>
  )
}

function NewSkeleton() {
  return (
    <div aria-hidden>
      <div className="max-w-xl">
        <Lines count={2} />
      </div>
      <div className="mt-14 lg:mt-20">
        <Block className="h-4 w-20" />
        <Block className="mt-3 h-9 w-72 max-w-full" />
        <div className="delayed mt-5 grid grid-cols-[repeat(2,70vw)] gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className={card === 2 ? 'hidden lg:block' : card === 3 ? 'hidden xl:block' : ''}>
              <div className="skeleton aspect-[4/5]" />
              <div className="skeleton mt-3 h-4 w-1/3" />
              <div className="skeleton mt-2 h-5 w-5/6" />
              <div className="skeleton mt-2 h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
