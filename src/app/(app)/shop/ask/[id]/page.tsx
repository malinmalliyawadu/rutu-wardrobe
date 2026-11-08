import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BackLink, ButtonLink, Section } from '@/components/ui/layout'
import { Refresh } from '@/components/ui/refresh'
import { Block, Lines } from '@/components/ui/skeleton'
import { usdText } from '@/lib/finder/settings'
import { getSearch, RUNNING, SCORE_USD_ESTIMATE, targetLine, type SearchView } from '@/lib/search'

import { FindCard } from '../../_components/find-card'

export const metadata = { title: 'Ask the shops' }

type Params = Promise<{ id: string }>

/**
 * One ask: what she said, what Claude understood, and what it found. While
 * it looks, the page says where it is and refreshes itself; leaving loses
 * nothing.
 */
export default function AskResultPage({ params }: { params: Params }) {
  return (
    <>
      <BackLink href="/shop/ask">Your asks</BackLink>
      <Suspense fallback={<ResultSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  )
}

async function Content({ params }: { params: Params }) {
  await connection()
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const search = await getSearch(id)
  if (!search) notFound()
  const running = RUNNING.includes(search.status)

  return (
    <>
      <header className="mb-10 lg:mb-14">
        {search.summary ? <p className="caption mb-3">You asked for “{search.request}”</p> : null}
        <h1 className="display">{search.summary ?? search.request.charAt(0).toUpperCase() + search.request.slice(1)}</h1>
        {/* What was understood, once it is; until then the progress says it is reading. */}
        {search.target ? <p className="prose-measure mt-4 text-lg text-ink-2">{targetLine(search.target)}</p> : null}
      </header>

      {running ? (
        <>
          <Progress search={search} />
          <Refresh />
        </>
      ) : search.status === 'failed' ? (
        <div className="max-w-xl">
          <p role="alert" className="text-lg text-ink-2">
            {search.error ?? 'It did not finish.'}
          </p>
          <ButtonLink href="/shop/ask" className="mt-6">
            Ask again
          </ButtonLink>
        </div>
      ) : (
        <Results search={search} />
      )}
    </>
  )
}

/**
 * Where it is, in words, over a thin rose line that fills as Claude judges.
 * The line grows by transform only; with reduced motion it jumps.
 */
function Progress({ search }: { search: SearchView }) {
  const { status, offered, scored, stats } = search
  const text =
    status === 'reading'
      ? 'Reading what you asked for.'
      : status === 'filtering'
        ? 'Looking through the shops for it in your size.'
        : status === 'scoring'
          ? offered === 0
            ? 'Nothing in the shops matched.'
            : `Judging the closest of ${(stats.candidates ?? offered).toLocaleString('en-NZ')} in your size: ${scored} done.`
          : 'Checking the shops for today’s price and stock.'
  const share =
    status === 'reading' ? 0.04 : status === 'filtering' ? 0.1 : status === 'scoring' ? 0.1 + 0.8 * fraction(search) : 0.95
  return (
    <div role="status" className="max-w-xl" aria-live="polite">
      <p className="text-lg">{text}</p>
      <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
      <p className="caption mt-3">About a minute. You can leave; it keeps looking.</p>
    </div>
  )
}

/** How far through what it can afford: the limit usually stops it before the end of the list. */
function fraction(search: SearchView): number {
  const affordable = Math.max(1, Math.floor(search.max_usd / SCORE_USD_ESTIMATE))
  const expected = Math.min(search.offered, affordable)
  return expected === 0 ? 0 : Math.min(1, search.scored / expected)
}

function Results({ search }: { search: SearchView }) {
  const { results, closest, stats } = search
  const judged = stats.scored ?? search.scored
  const pool = stats.candidates ?? 0
  const spent = usdText(Math.round(search.usd * 100) / 100)
  const capped = (stats.skipped_for_budget ?? 0) > 0
  const read =
    pool === 0
      ? 'Nothing in the shops matched it in your size.'
      : `Judged ${judged.toLocaleString('en-NZ')} of ${pool.toLocaleString('en-NZ')} in your size, closest to your words first${capped ? `, up to the ${usdText(search.max_usd)} limit` : ''}.`
  const title =
    results.length === 0
      ? 'Nothing good enough'
      : closest
        ? 'The closest'
        : results.length === 1
          ? 'One find'
          : `${results.length} finds`
  return (
    <>
      <Section title={title} aside={`Spent ${spent}`}>
        <p className="prose-measure -mt-2 mb-6 text-ink-2">
          {read}
          {closest ? ' Nothing cleared the bar; these came nearest.' : ''}
          {results.length > 0 ? ' What you save goes to your wishlist.' : ''}
        </p>
        {results.length > 0 ? (
          <div className="scroller auto-cols-[min(70vw,19rem)] gap-4 pb-1 sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:gap-x-4 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((find) => (
              <FindCard key={find.product_id} find={find} slotName={null} />
            ))}
          </div>
        ) : null}
      </Section>

      {search.target ? (
        <Section title="Want it every night?">
          <p className="prose-measure -mt-2 text-ink-2">
            Add it to your plan and the finder looks for it every night from now on.
          </p>
          <ButtonLink href={`/style/plan/new?search=${search.id}`} variant="quiet" className="mt-5">
            Add to your plan
          </ButtonLink>
        </Section>
      ) : null}
    </>
  )
}

function ResultSkeleton() {
  return (
    <div aria-hidden>
      <Block className="h-4 w-48" />
      <Block className="mt-4 h-14 w-3/4" />
      <div className="mt-5 max-w-lg">
        <Lines count={2} />
      </div>
    </div>
  )
}
