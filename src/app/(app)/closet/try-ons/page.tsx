import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { ButtonLink } from '@/components/ui/layout'
import { listOnMe, type OnMeImage } from '@/lib/on-me'
import { fullLengthPhoto } from '@/lib/try-on'

import { ClosetHead } from '../_components/head.tsx'
import { Making } from '../_components/making.tsx'
import { TryOnsSkeleton } from '../_components/skeletons.tsx'
import { eyebrow, SourceStrip } from '../_components/sources.tsx'

export const metadata: Metadata = { title: 'Try-ons' }

/*
 * Try-ons: every picture of her in something, newest first, each in the arch
 * (a picture of her is always an arch), with what it was made from small
 * underneath. One being made sits in its place and fills when it is done.
 */

export default function TryOnsPage() {
  return (
    <Suspense fallback={<TryOnsSkeleton />}>
      <TryOns />
    </Suspense>
  )
}

const CHOOSE = (
  <ButtonLink href="/closet/try-ons/new" size="small">
    Choose pieces
  </ButtonLink>
)

async function TryOns() {
  await connection()
  const [images, photo] = await Promise.all([listOnMe(), fullLengthPhoto()])

  if (images.length === 0) {
    return (
      <>
        <ClosetHead line="No pictures of you yet." />
        <section
          aria-labelledby="first"
          className="grid items-center gap-8 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-12 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
        >
          <div aria-hidden className="arch aspect-[3/4] w-full max-w-[11rem] bg-surface sm:max-w-none">
            <div className="absolute inset-[7%] rounded-[var(--radius-arch)] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
          </div>
          <div>
            <h2 id="first" className="headline">
              See it on you before you buy it
            </h2>
            <p className="prose-measure mt-3 text-ink-2">
              {photo
                ? 'Tap “See it on me” on a find or a look, or choose a few pieces here. Each picture is made from your full-length photo and kept here.'
                : 'Each picture is made from a full-length photo of you, so that comes first. Then tap “See it on me” on a find or a look, or choose pieces here.'}
            </p>
            {photo ? (
              <ButtonLink href="/closet/try-ons/new" className="mt-7">
                Choose pieces
              </ButtonLink>
            ) : (
              <ButtonLink href="/me/photos" className="mt-7">
                Add a full-length photo
              </ButtonLink>
            )}
          </div>
        </section>
      </>
    )
  }

  const ready = images.filter((image) => image.status === 'ready')
  const usd = ready.reduce((sum, image) => sum + (image.usd ?? 0), 0)
  const count = `${ready.length} ${ready.length === 1 ? 'picture' : 'pictures'} of you`
  return (
    <>
      <ClosetHead
        line={usd > 0 ? <span className="tabular">{`${count}, US$${usd.toFixed(2)} in all.`}</span> : `${count}.`}
        aside={CHOOSE}
      />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => (
          <li key={image.id}>
            <Tile image={image} />
          </li>
        ))}
      </ul>
    </>
  )
}

function Tile({ image }: { image: OnMeImage }) {
  return (
    <Link href={`/closet/try-ons/${image.id}`} className="pressable lift group block">
      {image.status === 'making' ? (
        <Making id={image.id} compact className="aspect-[3/4]" />
      ) : (
        <div className="arch aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a private, already-sized file; the optimiser would only copy it */}
          <img
            src={`/photos/try-ons/${image.id}`}
            alt={`You, ${image.subject.title}`}
            width={image.width ?? undefined}
            height={image.height ?? undefined}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      )}
      <span className="caption mt-3 block truncate">{eyebrow(image.subject)}</span>
      <span className="title mt-1 line-clamp-2 block">{image.subject.title}</span>
      <span className="mt-2.5 block">
        <SourceStrip sources={image.sources} />
      </span>
    </Link>
  )
}
