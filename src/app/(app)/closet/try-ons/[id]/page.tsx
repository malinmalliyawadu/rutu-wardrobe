import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { OutIcon } from '@/components/ui/icons'
import { BackLink, ButtonLink, Empty } from '@/components/ui/layout'
import { PiecePicture } from '@/components/ui/photos'
import { day } from '@/lib/format'
import { getOnMe, type OnMeDetail, type Source } from '@/lib/on-me'

import { MakeAgain } from '../../_components/make-again.tsx'
import { Making } from '../../_components/making.tsx'
import { SpreadSkeleton } from '../../_components/skeletons.tsx'
import { eyebrow, shownLine } from '../../_components/sources.tsx'

export const metadata: Metadata = { title: 'Try-on' }

/*
 * One picture of her as a spread: the picture in the arch on the left, and
 * beside it what it was, when it was made, everything it was made from (her
 * photo first), how to read it, and "Make it again". Under it, what OpenAI
 * was asked, folded away.
 */

export default function TryOnPage({ params }: PageProps<'/closet/try-ons/[id]'>) {
  return (
    <>
      <BackLink href="/closet/try-ons">Try-ons</BackLink>
      <Suspense fallback={<SpreadSkeleton arch />}>
        <Content params={params} />
      </Suspense>
    </>
  )
}

async function Content({ params }: Pick<PageProps<'/closet/try-ons/[id]'>, 'params'>) {
  await connection()
  const { id } = await params
  const numeric = Number(id)
  const picture = Number.isInteger(numeric) && numeric > 0 ? await getOnMe(numeric) : null

  if (!picture) {
    return (
      <div className="max-w-2xl">
        <Empty
          title="This picture is not here"
          line="It may have been deleted with your photos, or it could not be made."
          action={
            <ButtonLink href="/closet/try-ons" variant="quiet">
              Back to your try-ons
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const shop = picture.subject.kind === 'find' ? picture.sources[0]?.href : null
  const width = picture.width ?? 3
  const height = picture.height ?? 4

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <figure className="lg:sticky lg:top-6">
        {picture.status === 'making' ? (
          <Making id={picture.id} className="aspect-[3/4] w-full max-w-[26rem] lg:max-w-none" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a private, already-sized file; the optimiser would only copy it
          <img
            src={`/photos/try-ons/${picture.id}`}
            alt={`You, ${picture.subject.title}`}
            width={width}
            height={height}
            style={{ aspectRatio: `${width} / ${height}` }}
            className="h-auto w-full max-w-[26rem] rounded-[var(--radius-arch)] bg-photo object-cover lg:max-w-none"
          />
        )}
        <figcaption className="caption mt-3">
          {picture.status === 'making' ? 'Asked for' : 'Made'} {day(picture.started_at)}
          {picture.usd !== null ? <span className="tabular">, US${picture.usd.toFixed(2)}</span> : null}
        </figcaption>
      </figure>

      <div className="min-w-0 lg:pt-6">
        <p className="caption">{eyebrow(picture.subject)}</p>
        <h1 className="display mt-3">{picture.subject.title}</h1>
        <p className="prose-measure mt-6 text-ink-2">{note(picture)}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {picture.status === 'ready' ? <MakeAgain id={picture.id} /> : null}
          {shop ? (
            <a href={shop} target="_blank" rel="noopener noreferrer" className="link gap-1.5">
              At the shop
              <OutIcon className="size-4" />
            </a>
          ) : null}
        </div>

        <section aria-labelledby="made-from" className="mt-12 max-w-xl">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 id="made-from" className="headline">
              Made from
            </h2>
            <span className="caption tabular">{picture.sources.length + 1}</span>
          </div>
          <ul className="border-t border-line">
            <li className="flex items-center gap-4 border-b border-line py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- her photo, through its own private route */}
              <img
                src={`/photos/${picture.photo_id}?v=thumb`}
                alt=""
                width="48"
                height="64"
                className="h-16 w-12 shrink-0 rounded-[999px_999px_0.375rem_0.375rem] bg-surface object-cover"
              />
              <span className="min-w-0">
                <span className="block font-medium">Your full-length photo</span>
                <span className="caption mt-0.5 block">Added {day(picture.photo_taken)}</span>
              </span>
            </li>
            {picture.sources.map((source) => (
              <li key={source.key} className="border-b border-line">
                <SourceRow source={source} />
              </li>
            ))}
          </ul>
        </section>

        <details className="group mt-12 max-w-xl">
          <summary className="link cursor-pointer list-none text-ink-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">What OpenAI was asked</span>
            <span className="hidden group-open:inline">Hide what OpenAI was asked</span>
          </summary>
          <div className="crossfade mt-2">
            <p className="caption">
              {picture.model}
              {picture.size ? `, ${picture.size.replace('x', ' by ')}` : ''}
            </p>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
              {picture.prompt.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        </details>
      </div>
    </article>
  )
}

function SourceRow({ source }: { source: Source }) {
  const body = (
    <>
      <PiecePicture piece={source} sizes="3rem" className="block h-16 w-12 shrink-0" />
      <span className="min-w-0">
        <span className="line-clamp-2 block font-medium">{source.name}</span>
        <span className="caption mt-0.5 block">{shownLine(source)}</span>
      </span>
    </>
  )
  const className = 'pressable flex items-center gap-4 py-3'
  if (!source.href) return <div className={className}>{body}</div>
  if (!source.href.startsWith('/')) {
    return (
      <a href={source.href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    )
  }
  return (
    <Link href={source.href as never} className={className}>
      {body}
    </Link>
  )
}

/** How to read it: judge colour against the clothes, and what was only described. */
function note(picture: OnMeDetail): string {
  const words = picture.sources.filter((source) => source.shown === 'words').length
  const base = 'Judge the colours against the clothes themselves: the picture cannot know how each one sits on you.'
  if (words === 0) return base
  if (words === picture.sources.length) return `${base} None of these had a photo, so each was drawn from its description.`
  return `${base} ${words === 1 ? 'One piece had' : `${words} pieces had`} no photo, so ${words === 1 ? 'it was' : 'they were'} drawn from the description.`
}
