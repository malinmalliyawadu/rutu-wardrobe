import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, ButtonLink } from '@/components/ui/layout'
import { Refresh } from '@/components/ui/refresh'
import { lookWearLine } from '@/lib/format'
import { latestLookImages } from '@/lib/look-image'
import { OCCASION_LABELS, todayNz } from '@/lib/looks'
import { getOutfit, type OutfitView } from '@/lib/outfit'
import { askedFor } from '@/lib/outfit-values'

import { LookCard } from '../../_components/look-card.tsx'
import { OutfitSpread } from '../../_components/outfit-spread.tsx'
import { SpreadSkeleton } from '../../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Dress me' }

/*
 * One outfit she asked for. While it is made, where it is, refreshing itself;
 * leaving loses nothing. Then a spread: a look, when it is all her own
 * pieces, or the outfit with the shops' pieces or described ones in it.
 */

export default function OutfitPage({ params }: PageProps<'/closet/dress/[id]'>) {
  return (
    <>
      <BackLink href="/closet/dress">Dress me</BackLink>
      <Suspense fallback={<SpreadSkeleton arch />}>
        <Content params={params} />
      </Suspense>
    </>
  )
}

async function Content({ params }: Pick<PageProps<'/closet/dress/[id]'>, 'params'>) {
  await connection()
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const outfit = await getOutfit(id)
  if (!outfit) notFound()

  if (outfit.status === 'making') {
    return (
      <>
        <header className="mb-10 lg:mb-14">
          <p className="caption mb-3">{askedFor(outfit)}</p>
          <h1 className="display">Putting it together</h1>
        </header>
        <Progress outfit={outfit} />
        <Refresh />
      </>
    )
  }

  if (outfit.status === 'failed') return <Stopped asked={askedFor(outfit)} title="It did not come together" line={outfit.error ?? 'It did not finish.'} alert />
  if (outfit.dismissed) return <Stopped asked={askedFor(outfit)} title="You dismissed this one" />

  if (outfit.look) {
    const images = await latestLookImages([outfit.look.id])
    return (
      <LookCard
        key={outfit.look.id}
        look={outfit.look}
        image={images.get(outfit.look.id) ?? null}
        today={todayNz()}
        occasion={OCCASION_LABELS[outfit.look.occasion]}
        wornLine={lookWearLine(outfit.look)}
        canDraw={Boolean(process.env.OPENAI_API_KEY)}
        wide
        asked={askedFor(outfit)}
      />
    )
  }

  if (outfit.parts.length === 0) return <Stopped asked={askedFor(outfit)} title="Its pieces have gone" line="They are no longer in your closet or the shops." />

  // An outfit from anything gets its picture of her right after it is made: keep reading until it is there.
  const drawing = outfit.source === 'anywhere' && (outfit.on_me ? outfit.on_me.status === 'making' : outfit.just_made)
  return (
    <>
      <OutfitSpread
        key={outfit.id}
        outfit={outfit}
        occasion={outfit.occasion ? OCCASION_LABELS[outfit.occasion] : 'Outfit'}
        asked={askedFor(outfit)}
        drawing={drawing}
      />
      {drawing ? <Refresh /> : null}
    </>
  )
}

function Stopped({ asked, title, line, alert = false }: { asked: string; title: string; line?: string; alert?: boolean }) {
  return (
    <div className="max-w-xl">
      <p className="caption mb-3">{asked}</p>
      <h1 className="display">{title}</h1>
      {line ? (
        <p role={alert ? 'alert' : undefined} className="mt-4 text-lg text-ink-2">
          {line}
        </p>
      ) : null}
      <ButtonLink href="/closet/dress" className="mt-6">
        Ask again
      </ButtonLink>
    </div>
  )
}

/** Where it is, in words, over a thin rose line that fills by stage. The line grows by transform only. */
function Progress({ outfit }: { outfit: OutfitView }) {
  const text =
    outfit.stage === 'planning'
      ? 'Reading what it is for, and what to look for in the shops.'
      : outfit.stage === 'looking'
        ? 'Looking through the shops for each piece in your size.'
        : outfit.source === 'closet'
          ? 'Putting the outfit together from your pieces.'
          : outfit.source === 'anywhere'
            ? 'Putting the outfit together, piece by piece.'
            : 'Putting the outfit together from the closest of each.'
  const share = outfit.stage === 'planning' ? 0.1 : outfit.stage === 'looking' ? 0.35 : 0.7
  return (
    <div role="status" aria-live="polite" className="max-w-xl">
      <p className="text-lg">{text}</p>
      <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
      <p className="caption mt-3">A minute or two. You can leave; it keeps going.</p>
    </div>
  )
}
