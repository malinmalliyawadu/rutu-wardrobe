import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { ButtonLink, Empty, RowLink } from '@/components/ui/layout'
import { Refresh } from '@/components/ui/refresh'
import { whenSaid } from '@/lib/format'
import { gymReadiness, readiness } from '@/lib/looks'
import { listOutfits, outfitTotals, type OutfitSource, type OutfitSummary } from '@/lib/outfit'
import { askedFor } from '@/lib/outfit-values'
import { listPieces } from '@/lib/pieces'
import { getGuide } from '@/lib/style-guide'
import { fullLengthPhoto } from '@/lib/try-on'

import { AskOutfit } from '../_components/ask-outfit.tsx'
import { ClosetHead } from '../_components/head.tsx'
import { DressSkeleton } from '../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Dress me' }

/*
 * Dress me: one outfit for whatever she says it is for, from her closet, the
 * shops, both, or anything. The ask opens the page; under it, the outfits she
 * asked for, each a way back to its spread (/closet/dress/[id]).
 */

export default function DressPage() {
  return (
    <Suspense fallback={<DressSkeleton />}>
      <Dress />
    </Suspense>
  )
}

async function Dress() {
  await connection()
  const [guide, pieces, outfits, totals, photo] = await Promise.all([getGuide(), listPieces(), listOutfits(12), outfitTotals(), fullLengthPhoto()])

  if (!guide) {
    return (
      <>
        <ClosetHead line="One outfit for anything." />
        <div className="max-w-2xl">
          <Empty
            title="Outfits start from your style guide"
            line="Each one is put together against your colours and the shapes that suit you, so the guide comes first."
            action={<ButtonLink href="/style/palette">Draft your style guide</ButtonLink>}
          />
        </div>
      </>
    )
  }

  const making = outfits.find((outfit) => outfit.status === 'making') ?? null
  const owned = readiness(pieces).ready || gymReadiness(pieces).ready
  const sources: OutfitSource[] = owned ? ['closet', 'shops', 'both', 'anywhere'] : ['shops', 'both', 'anywhere']
  // Starts from what she last asked for, but never from anything: that sends her photo, so it is only ever chosen.
  const last = outfits[0]?.source
  const initial = last && last !== 'anywhere' && sources.includes(last) ? last : sources[0]!
  const line = making
    ? 'Putting an outfit together.'
    : totals.count === 0
      ? 'One outfit for anything, from your closet, the shops, both, or none of them.'
      : `${totals.count} ${totals.count === 1 ? 'outfit' : 'outfits'} so far, US$${totals.usd.toFixed(2)}.`

  return (
    <>
      <ClosetHead line={line} />
      {making ? (
        <div className="max-w-2xl">
          <p className="headline">One is in the making</p>
          <p className="prose-measure mt-3 text-ink-2">One at a time. It takes a minute or two, and carries on if you leave.</p>
          <ButtonLink href={`/closet/dress/${making.id}`} className="mt-6">
            See where it is
          </ButtonLink>
          <Refresh />
        </div>
      ) : (
        <AskOutfit sources={sources} initial={initial} canPicture={Boolean(process.env.OPENAI_API_KEY) && photo !== null} />
      )}
      {outfits.length > 0 ? <Earlier outfits={outfits} /> : null}
    </>
  )
}

/** One list on the phone; two columns on the laptop, each keeping its own hairlines. */
function Earlier({ outfits }: { outfits: OutfitSummary[] }) {
  const now = new Date()
  const middle = Math.ceil(outfits.length / 2)
  const halves = [outfits.slice(0, middle), outfits.slice(middle)].filter((half) => half.length > 0)
  return (
    <section aria-labelledby="dress-earlier" className="mt-14 lg:mt-20">
      <h2 id="dress-earlier" className="headline mb-3">
        Your outfits
      </h2>
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
        {halves.map((half, index) => (
          <ul key={index} className={index > 0 ? 'border-t border-line lg:border-t-0' : undefined}>
            {half.map((outfit) => (
              <li key={outfit.id} className="border-b border-line last:border-b-0">
                <RowLink href={`/closet/dress/${outfit.id}`} title={rowTitle(outfit)} line={rowLine(outfit, now)} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}

function rowTitle(outfit: OutfitSummary): string {
  if (outfit.title) return outfit.title
  return outfit.status === 'making' ? 'In the making' : 'Did not finish'
}

function rowLine(outfit: OutfitSummary, now: Date): string {
  const when = whenSaid(outfit.started_at, now)
  const said = when.charAt(0).toUpperCase() + when.slice(1)
  const asked = askedFor(outfit)
  return `${said}, ${asked.charAt(0).toLowerCase()}${asked.slice(1)}`
}
