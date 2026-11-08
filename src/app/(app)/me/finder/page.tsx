import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { Block } from '@/components/ui/skeleton'
import { liveRun } from '@/lib/finder/runs'
import { getFinderSettings, getSpend, storeCounts, usdText } from '@/lib/finder/settings'
import { tryOnSpend } from '@/lib/try-on'

import { FinderForm } from '../_components/finder-form'
import { FormSkeleton } from '../_components/form-skeleton'
import { RunNow } from '../_components/run-now'

export const metadata = { title: 'The finder' }

const ZONE = { timeZone: 'Pacific/Auckland' } as const

/**
 * The finder: what it has spent, a run now, what it may spend and which shops
 * it reads, and what the try-ons have cost (billed by OpenAI, with no limit
 * to set, since each is made only on her tap).
 */
export default function FinderPage() {
  return (
    <>
      <BackLink href="/me">Me</BackLink>
      <PageHead
        title="The finder"
        line="Every night it reads the shops, keeps what fits you and your plan, and has Claude judge the rest. This is what it may spend and where it looks."
      />
      <Suspense fallback={<FinderSkeleton />}>
        <Finder />
      </Suspense>
    </>
  )
}

async function Finder() {
  await connection()
  const [settings, spend, stores, tryOns, run] = await Promise.all([
    getFinderSettings(),
    getSpend(),
    storeCounts(),
    tryOnSpend(),
    liveRun(),
  ])
  const last = spend.lastRun
  const month = new Date().toLocaleDateString('en-NZ', { month: 'long', ...ZONE })
  const each = tryOns.count > 0 ? round(tryOns.usd / tryOns.count) : null

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-16">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Figure
            caption="Last run"
            value={last ? usdText(round(last.usd)) : 'None yet'}
            line={
              last
                ? `${last.scored.toLocaleString('en-NZ')} judged, ${(last.finished_at ?? last.started_at).toLocaleDateString('en-NZ', { weekday: 'long', ...ZONE })}`
                : 'Tonight is the first'
            }
          />
          <Figure caption="This month" value={usdText(round(spend.thisMonth))} line={`${month}, by Claude`} />
          <Figure
            caption="Try-ons this month"
            value={usdText(round(tryOns.thisMonthUsd))}
            line={tryOns.thisMonthCount === 1 ? '1 picture, by OpenAI' : `${tryOns.thisMonthCount} pictures, by OpenAI`}
          />
          <Figure
            caption="Each try-on"
            value={each === null ? 'None yet' : usdText(each)}
            line={tryOns.count > 0 ? `Across ${tryOns.count === 1 ? 'the one' : `all ${tryOns.count}`} made` : 'Measured from the first'}
          />
        </dl>
        <RunNow run={run} />
      </div>

      <div className="mt-14 lg:mt-20">
        <FinderForm
          key={[
            settings.max_usd_per_run,
            settings.max_usd_per_month,
            settings.max_usd_per_search,
            settings.max_usd_statements,
            ...stores.filter((store) => store.enabled).map((store) => store.slug),
          ].join('|')}
          settings={settings}
          stores={stores}
          perScore={spend.perScore}
        />
      </div>
    </>
  )
}

/** A figure: what it is, the number in large, one line under it. */
function Figure({ caption, value, line }: { caption: string; value: string; line: string }) {
  return (
    <div>
      <dt className="caption">{caption}</dt>
      <dd className="tabular mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{value}</dd>
      <dd className="mt-0.5 text-sm text-ink-2">{line}</dd>
    </div>
  )
}

function FinderSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index}>
              <Block className="h-3.5 w-20" />
              <Block className="mt-2 h-8 w-24" />
              <Block className="mt-2 h-3.5 w-32" />
            </div>
          ))}
        </div>
        <Block className="h-24 rounded-[var(--radius-control)]" />
      </div>
      <div className="mt-14 lg:mt-20">
        <FormSkeleton />
      </div>
    </div>
  )
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
