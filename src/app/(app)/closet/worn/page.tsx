import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'

import { Empty, Section } from '@/components/ui/layout'
import { nzDay, times, wearLine } from '@/lib/format'
import { latestLookImages } from '@/lib/look-image'
import { OCCASION_LABELS, type Look } from '@/lib/looks'
import type { Piece } from '@/lib/pieces'
import { getGuide } from '@/lib/style-guide'
import { NEVER_DAYS, readWear, ROTATE_OFFERS, type PieceWear } from '@/lib/wear'

import { colourOf } from '../_components/colour.ts'
import { ClosetHead } from '../_components/head.tsx'
import { WornSkeleton } from '../_components/skeletons.tsx'
import { WornLook, WornPiece } from '../_components/worn-rows.tsx'

export const metadata: Metadata = { title: 'Worn' }

/*
 * What gets worn and what only gets offered (src/lib/wear.ts), to let go by:
 * the pieces to rotate out first, by a rule said under its name; then her
 * saved looks, the rest of her pieces, the pieces no look has worn, and the
 * looks offered and left. Every list puts what she passes over most at the
 * top, and every row has the one way to let it go.
 */

export default function WornPage() {
  return (
    <Suspense fallback={<WornSkeleton />}>
      <Worn />
    </Suspense>
  )
}

async function Worn() {
  await connection()
  const [page, guide] = await Promise.all([readWear(), getGuide()])

  if (!page.since) {
    return (
      <>
        <ClosetHead line="Nothing offered yet." />
        <div className="max-w-2xl">
          <Empty
            title="Counts start with your first looks"
            line="Every look you are offered and every day you wear one is counted here, so you can see what you pass over and let it go."
          />
        </div>
      </>
    )
  }

  const images = await latestLookImages([...page.saved, ...page.offered].map((look) => look.id))
  const line = `${page.days_worn === 0 ? 'Nothing worn' : `Worn on ${page.days_worn} ${page.days_worn === 1 ? 'day' : 'days'}`} since ${nzDay(page.since)}.`
  const lookRow = (look: Look) => (
    <WornLook
      key={look.id}
      look={look}
      image={images.get(look.id) ?? null}
      occasion={OCCASION_LABELS[look.occasion]}
      line={wearLine({ offered: look.offered, on_today: look.on_today, worn: look.worn.length, last_worn: look.worn[0] ?? null })}
    />
  )
  const pieceRow = (piece: Piece, wear: PieceWear | null) => (
    <WornPiece
      key={piece.id}
      piece={piece}
      colour={colourOf(piece, guide)}
      line={
        wear
          ? wearLine(wear)
          : `Never in a look, yours since ${nzDay(piece.created_at.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }))}.`
      }
    />
  )

  return (
    <>
      <ClosetHead line={line} />
      <div>
        <Group
          title="Rotate out"
          count={page.rotate.length}
          hint={`Offered ${times(ROTATE_OFFERS)} or more and worn on at most one in four, or in your closet ${NEVER_DAYS} days with no look wearing it.`}
          empty="Nothing yet. Every piece is worn often enough for how often it comes up."
        >
          {page.rotate.map((piece) => pieceRow(piece, piece.wear.offered + piece.wear.worn > 0 ? piece.wear : null))}
        </Group>

        {page.saved.length > 0 ? (
          <Group title="Saved looks" count={page.saved.length} hint="Offered often and worn little first.">
            {page.saved.map(lookRow)}
          </Group>
        ) : null}

        {page.pieces.length > 0 ? (
          <Group
            title={page.rotate.length > 0 ? 'Other pieces' : 'Pieces'}
            count={page.pieces.length}
            hint="Counted through the looks they are in, offered often and worn little first."
          >
            {page.pieces.map((piece) => pieceRow(piece, piece.wear))}
          </Group>
        ) : null}

        {page.never.length > 0 ? (
          <Group title="Never in a look" count={page.never.length} hint="No look has worn these yet, the longest yours first.">
            {page.never.map((piece) => pieceRow(piece, null))}
          </Group>
        ) : null}

        {page.offered.length > 0 ? (
          <Group title="Offered, never saved" count={page.offered.length} hint="Dismissing one tells the next looks why.">
            {page.offered.map(lookRow)}
          </Group>
        ) : null}
      </div>
    </>
  )
}

function Group({
  title,
  count,
  hint,
  empty,
  children,
}: {
  title: string
  count: number
  hint: string
  empty?: string
  children: ReactNode
}) {
  return (
    <Section title={title} aside={count > 0 ? <span className="tabular">{count}</span> : undefined}>
      <p className="prose-measure -mt-2 text-sm text-ink-3">{hint}</p>
      {count === 0 && empty ? (
        <p className="mt-4 text-ink-2">{empty}</p>
      ) : (
        <ul className="mt-3 grid gap-x-12 lg:grid-cols-2">{children}</ul>
      )}
    </Section>
  )
}
