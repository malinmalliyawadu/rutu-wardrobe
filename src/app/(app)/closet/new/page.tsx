import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { fillableSlots } from '@/lib/pieces'
import { getGuide } from '@/lib/style-guide'

import { AddPiece } from '../_components/add-piece.tsx'
import { paletteSwatches } from '../_components/piece-values.ts'
import { AddSkeleton } from '../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Add a piece' }

export default function NewPiecePage({ searchParams }: PageProps<'/closet/new'>) {
  return (
    <>
      <BackLink href="/closet">Closet</BackLink>
      <PageHead title="Add a piece" />
      <Suspense fallback={<AddSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  )
}

/**
 * After "Save and add another" the page comes back with ?added=, and the
 * form starts fresh for the next piece: a new key drops the last one's read.
 */
async function Content({ searchParams }: Pick<PageProps<'/closet/new'>, 'searchParams'>) {
  await connection()
  const [guide, slots, { added }] = await Promise.all([getGuide(), fillableSlots(null), searchParams])
  const key = typeof added === 'string' ? added : 'first'
  return (
    <>
      {key !== 'first' ? (
        <p role="status" className="-mt-4 mb-8 text-ink-2 lg:-mt-6">
          Added to your closet. On to the next one.
        </p>
      ) : null}
      <AddPiece key={key} {...paletteSwatches(guide)} slots={slots} />
    </>
  )
}
