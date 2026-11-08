import { Suspense } from 'react'

import { Section } from '@/components/ui/layout'

import { Health, HealthSkeleton } from './_components/health'
import { FinderRow, HubHead, HubHeadSkeleton, ProfileRows, RowsSkeleton } from './_components/hub'

export const metadata = { title: 'Me' }

/**
 * Me: her profile, edited rarely, as a calm list of rows, each with a line on
 * what is saved; and beside it on the laptop, the systems (the finder's spend
 * and shops, and whether the database, Claude and the photo store answer).
 * The names are known before the data, so only the lines wait.
 */
export default function MePage() {
  return (
    <>
      <Suspense fallback={<HubHeadSkeleton />}>
        <HubHead />
      </Suspense>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
        <Section title="About you">
          <Suspense fallback={<RowsSkeleton titles={PROFILE_ROWS} />}>
            <ProfileRows />
          </Suspense>
        </Section>

        <Section title="Systems" className="mt-0!">
          <Suspense fallback={<RowsSkeleton titles={['The finder']} />}>
            <FinderRow />
          </Suspense>
          <Suspense fallback={<HealthSkeleton />}>
            <Health />
          </Suspense>
        </Section>
      </div>
    </>
  )
}

const PROFILE_ROWS = ['Photos', 'Colouring and proportions', 'Sizes', 'Your week', 'Taste', 'Budget']
