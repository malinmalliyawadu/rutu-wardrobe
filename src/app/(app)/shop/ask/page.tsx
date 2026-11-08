import { connection } from 'next/server'
import { Suspense } from 'react'

import { ButtonLink, BackLink, PageHead, RowLink } from '@/components/ui/layout'
import { Block } from '@/components/ui/skeleton'
import { whenSaid } from '@/lib/format'
import { getFinderSettings, getSpend, usdText } from '@/lib/finder/settings'
import { listSearches, RUNNING, searchBudget, type SearchSummary } from '@/lib/search'
import { getGuide } from '@/lib/style-guide'

import { AskForm } from '../_components/ask-form'

export const metadata = { title: 'Ask the shops' }

/**
 * Asking the shops for something: she says what she is after, the way she
 * would to a shop assistant, and Claude looks through what the shops had
 * last night. Her recent asks are under the line, each a way back to what it
 * found.
 */
export default function AskPage() {
  return (
    <>
      <BackLink href="/shop">New in</BackLink>
      <PageHead
        title="Ask the shops"
        line="Say what you are after, the way you would to a shop assistant. Claude looks through what the shops had last night, in your size, and judges the closest against your palette."
      />
      <Suspense fallback={<AskSkeleton />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await connection()
  const [guide, settings, spend, searches] = await Promise.all([getGuide(), getFinderSettings(), getSpend(), listSearches()])

  if (!guide) {
    return (
      <>
        <div className="max-w-2xl">
          <p className="prose-measure text-ink-2">
            Every find is judged against your palette, so draft it first. It takes a minute, from the read of your colouring.
          </p>
          <ButtonLink href="/style/palette" className="mt-6">
            Draft your palette
          </ButtonLink>
        </div>
        {searches.length > 0 ? <Recent searches={searches} /> : null}
      </>
    )
  }

  const budget = searchBudget(settings.max_usd_per_search, settings.max_usd_per_month, spend.thisMonth)
  const hint =
    budget > 0
      ? `About a minute, for up to ${usdText(budget)}. You can leave while it looks.`
      : 'Asking is off: its limit is spent or set to nothing in Me, under the finder.'
  return (
    <>
      <AskForm id="ask" label="What are you after?" hint={hint} primary />
      {searches.length > 0 ? <Recent searches={searches} /> : null}
    </>
  )
}

/** One list on the phone; two columns on the laptop, each keeping its own hairlines. */
function Recent({ searches }: { searches: SearchSummary[] }) {
  const now = new Date()
  const middle = Math.ceil(searches.length / 2)
  const halves = [searches.slice(0, middle), searches.slice(middle)].filter((half) => half.length > 0)
  return (
    <section aria-labelledby="ask-recent" className="mt-14 lg:mt-20">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="ask-recent" className="headline">
          Your asks
        </h2>
        {searches.length >= 12 ? <p className="caption">The latest {searches.length}</p> : null}
      </div>
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
        {halves.map((half, index) => (
          <ul key={index} className={index > 0 ? 'border-t border-line lg:border-t-0' : undefined}>
            {half.map((search) => (
              <li key={search.id} className="border-b border-line last:border-b-0">
                <RowLink
                  href={`/shop/ask/${search.id}`}
                  title={search.summary ?? `“${search.request}”`}
                  line={line(search, now)}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}

function line(search: SearchSummary, now: Date): string {
  const when = whenSaid(search.started_at, now)
  const said = when.charAt(0).toUpperCase() + when.slice(1)
  if (RUNNING.includes(search.status)) return `${said}, still looking`
  if (search.status === 'failed') return `${said}, did not finish`
  const finds = search.finds === 0 ? 'nothing good enough' : `${search.finds} ${search.finds === 1 ? 'find' : 'finds'}`
  return `${said}, ${finds}, ${usdText(Math.round(search.usd * 100) / 100)}`
}

function AskSkeleton() {
  return (
    <div aria-hidden className="max-w-2xl">
      <Block className="mb-2 h-4 w-36" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Block className="h-12 rounded-[var(--radius-control)] sm:flex-1" />
        <Block className="h-12 w-36 rounded-[var(--radius-control)]" />
      </div>
      <Block className="mt-2 h-4 w-72 max-w-full" />
    </div>
  )
}
