import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { ButtonLink, Empty, Section } from '@/components/ui/layout'
import { Refresh } from '@/components/ui/refresh'
import { day, list, lookWearLine } from '@/lib/format'
import { latestLookImages, type LookImage } from '@/lib/look-image'
import { gymReadiness, OCCASION_LABELS, readiness, readLooks, todayNz, type Look, type LookKind } from '@/lib/looks'
import { listPieces } from '@/lib/pieces'
import { getGuide } from '@/lib/style-guide'

import { ClosetHead } from '../_components/head.tsx'
import { LookCard } from '../_components/look-card.tsx'
import { MakeLooks } from '../_components/make-looks.tsx'
import { LooksSkeleton } from '../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Looks' }

/*
 * Looks: outfits made from her pieces. The newest set first, each look in the
 * arch; then the looks she saved from earlier sets; and the way to make a new
 * set, for her week or gym fits only. Looks she saves or dismisses teach the
 * next set.
 */

export default function LooksPage() {
  return (
    <Suspense fallback={<LooksSkeleton />}>
      <Looks />
    </Suspense>
  )
}

async function Looks() {
  await connection()
  const [pieces, guide, page] = await Promise.all([listPieces(), getGuide(), readLooks()])
  const ready = readiness(pieces)
  const gym = gymReadiness(pieces)
  const kinds: LookKind[] = [...(ready.ready ? ['week' as const] : []), ...(gym.ready ? ['gym' as const] : [])]
  // Some gym kit, but not yet a whole fit: say what it lacks.
  const someKit = pieces.some((piece) => !piece.set_aside_at && piece.worn_for !== 'everyday')

  if (!guide) {
    return (
      <>
        <ClosetHead line="No looks yet." />
        <div className="max-w-2xl">
          <Empty
            title="Looks start from your style guide"
            line="Each look is put together against your colours and the shapes that suit you, so the guide comes first."
            action={<ButtonLink href="/style/palette">Draft your style guide</ButtonLink>}
          />
        </div>
      </>
    )
  }

  if (kinds.length === 0 && page.saved.length === 0 && page.fresh.length === 0) {
    const active = pieces.filter((piece) => !piece.set_aside_at).length
    return (
      <>
        <ClosetHead line="No looks yet." />
        <div className="max-w-2xl">
          <Empty
            title="A few pieces more"
            line={`${active === 0 ? 'Your closet is empty.' : `You have ${active} ${active === 1 ? 'piece' : 'pieces'}.`} To make a look, add ${list(ready.missing)}.`}
            action={<ButtonLink href="/closet/new">Add a piece</ButtonLink>}
          />
        </div>
      </>
    )
  }

  const today = todayNz()
  const canDraw = Boolean(process.env.OPENAI_API_KEY)
  const shown = [...page.fresh, ...page.saved]
  const images = await latestLookImages(shown.map((look) => look.id))
  const drawing = [...images.values()].some((image) => image.status === 'making')
  const fresh = page.fresh.length > 0 && page.latest ? page.latest : null
  const noun = (kind: LookKind | undefined, count: number) =>
    kind === 'gym' ? (count === 1 ? 'gym fit' : 'gym fits') : count === 1 ? 'look' : 'looks'
  const line = fresh
    ? `${page.fresh.length} ${noun(fresh.kind, page.fresh.length)} made ${day(fresh.created_at)}${page.saved.length > 0 ? `, ${page.saved.length} saved before` : ''}.`
    : page.saved.length > 0
      ? `${page.saved.length} saved ${noun(undefined, page.saved.length)}.`
      : 'No looks yet.'

  const make = (
    <Section
      title={page.latest ? 'New looks' : 'Your first looks'}
      aside={
        page.total.sets > 0
          ? `${page.total.sets} ${page.total.sets === 1 ? 'set' : 'sets'} so far, US$${page.total.usd.toFixed(2)}`
          : undefined
      }
    >
      <p className="prose-measure mb-5 text-ink-2">
        {ready.ready
          ? 'Six outfits from your pieces, for your week and this month in Wellington. The looks you save or dismiss teach the next set.'
          : gym.ready
            ? `Gym fits from your kit, for this month in Wellington. For everyday looks, add ${list(ready.missing)}.`
            : `To make ${page.latest ? 'more' : 'one'}, add ${list(ready.missing)}.`}
        {someKit && !gym.ready ? ` For gym fits, mark ${list(gym.missing)} as gym kit.` : ''}
      </p>
      {kinds.length > 0 ? (
        <MakeLooks first={!page.latest} kinds={kinds} />
      ) : (
        <ButtonLink href="/closet/new" variant="quiet">
          Add a piece
        </ButtonLink>
      )}
    </Section>
  )

  return (
    <>
      <ClosetHead line={line} />
      <div>
        {fresh ? (
          <Grid
            title={fresh.kind === 'gym' ? 'The newest gym fits' : 'The newest set'}
            aside={fresh.note ? `For “${fresh.note}”` : `From ${fresh.pieces} pieces`}
            looks={page.fresh}
            images={images}
            today={today}
            canDraw={canDraw}
          />
        ) : null}
        {fresh ? null : make}
        {page.saved.length > 0 ? (
          <Grid title="Saved" aside="Wearing a look saves it" looks={page.saved} images={images} today={today} canDraw={canDraw} />
        ) : null}
        {fresh ? make : null}
      </div>
      {drawing ? <Refresh /> : null}
    </>
  )
}

function Grid({
  title,
  aside,
  looks,
  images,
  today,
  canDraw,
}: {
  title: string
  aside: string
  looks: Look[]
  images: Map<number, LookImage>
  today: string
  canDraw: boolean
}) {
  return (
    <Section title={title} aside={aside}>
      <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {looks.map((look) => (
          <li key={look.id} className="flex *:w-full">
            <LookCard
              look={look}
              image={images.get(look.id) ?? null}
              today={today}
              occasion={OCCASION_LABELS[look.occasion]}
              wornLine={lookWearLine(look)}
              canDraw={canDraw}
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}
