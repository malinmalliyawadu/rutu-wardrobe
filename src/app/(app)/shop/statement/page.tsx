import Link from 'next/link'
import { Suspense } from 'react'

import { Empty } from '@/components/ui/layout'
import { TileGrid } from '@/components/ui/skeleton'
import { QUALITIES, QUALITY_LABELS, type Quality } from '@/lib/finder/statements'
import { getStatements, qualitiesText, type Statements } from '@/lib/statements'

import { FindCard } from '../_components/find-card'
import { ShopHead } from '../_components/shop-head'

export const metadata = { title: 'Statement pieces' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The pieces that carry an outfit, by a colour of hers, a texture or a cut,
 * that Claude chose for her from everything the finder read. Each says what
 * makes it one and which of her pieces it wears with. The filter is the URL,
 * so a view can be gone back to.
 */
export default function StatementPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ShopHead
        title="Statement pieces"
        line="The one piece an outfit is built around: a colour of yours, a texture worth touching, or a cut that does the talking."
      />
      <Suspense fallback={<StatementSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  )
}

function parseQuality(value: string | string[] | undefined): Quality | null {
  const first = Array.isArray(value) ? value[0] : value
  return (QUALITIES as readonly string[]).includes(first ?? '') ? (first as Quality) : null
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const quality = parseQuality((await searchParams).by)
  const statements = await getStatements({ quality })
  const { run, finds, total, waiting } = statements

  if (!run) {
    return (
      <Empty
        title="The first are chosen overnight"
        line="Every night the finder looks through everything it reads for pieces that stand out by colour, texture or cut, in your size and budget, and Claude judges which suit you."
      />
    )
  }

  if (total === 0) {
    return (
      <Empty
        title="Nothing has stood out yet"
        line={
          waiting > 0
            ? `${waiting.toLocaleString('en-NZ')} more ${waiting === 1 ? 'is' : 'are'} waiting to be judged on the coming nights.`
            : 'Nothing the shops had last night was bold enough and right for you. The finder looks again tonight.'
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Filter current={quality} statements={statements} />
        <p className="caption">
          In your size and budget, best for you first.
          {waiting > 0 ? ` ${waiting.toLocaleString('en-NZ')} more to judge on the coming nights.` : ''}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-12 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {finds.map((find) => (
          <FindCard
            key={find.product_id}
            find={find}
            slotName={null}
            statement={{ qualities: qualitiesText(find.qualities), wearsWith: find.wears_with, outfitOnMe: find.outfit_on_me }}
            sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 26vw, (min-width: 440px) 45vw, 90vw"
          />
        ))}
      </div>
    </div>
  )
}

/** All, then each quality with its count; one with none is left out. Plain links, so the URL holds the view. */
function Filter({ current, statements }: { current: Quality | null; statements: Statements }) {
  const items = [
    { key: null, href: '/shop/statement', label: 'All', count: statements.total },
    ...QUALITIES.map((quality) => ({
      key: quality,
      href: `/shop/statement?by=${quality}`,
      label: QUALITY_LABELS[quality],
      count: statements.byQuality[quality],
    })),
  ].filter((item) => item.count > 0 || item.key === current)
  return (
    <nav
      aria-label="What makes them a statement"
      className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] lg:mx-0 lg:px-0"
    >
      <ul className="flex gap-2">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href as never}
              scroll={false}
              aria-current={item.key === current ? 'page' : undefined}
              className="chip"
            >
              {item.label}
              <span className="tabular opacity-70">{item.count.toLocaleString('en-NZ')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function StatementSkeleton() {
  return (
    <div aria-hidden>
      <div className="delayed mb-8 flex gap-2">
        {[0, 1, 2].map((chip) => (
          <div key={chip} className="skeleton h-10 w-24 rounded-full" />
        ))}
      </div>
      <TileGrid count={4} />
    </div>
  )
}
