import Link from 'next/link'
import { connection } from 'next/server'

import { ButtonLink, Empty } from '@/components/ui/layout'
import { Swatches } from '@/components/ui/swatch'
import { CARDS_PER_SLOT, getFeed, type FeedGroup, type Run } from '@/lib/feed'
import { sizeGroup } from '@/lib/finder/classify'
import { usdText } from '@/lib/finder/settings'
import { list, whenSaid } from '@/lib/format'
import { getProfile, type Sizes } from '@/lib/profile'
import { colourNameFor, getGuide, type StoredGuide } from '@/lib/style-guide'
import { PRIORITY_LABELS } from '@/lib/wardrobe-values'

import { FindCard } from './find-card.tsx'

/*
 * Last night's finds, by the slot in her plan each is for, in plan order and
 * best first within a slot. A slot is a row that swipes on the phone and a
 * grid on the laptop. Streams in under the static head; nothing animates in.
 */

export async function NewFinds() {
  await connection()
  const [feed, guide, profile] = await Promise.all([getFeed(), getGuide(), getProfile()])

  if (Object.keys(feed.slotNames).length === 0) {
    return (
      <Empty
        title="Nothing to look for yet"
        line="Every night the finder reads the shops for the pieces in your plan. Draft your plan, and its first finds are here in the morning."
        action={<ButtonLink href="/style/plan">Draft your plan</ButtonLink>}
      />
    )
  }

  if (!feed.run) {
    return (
      <Empty
        title="Your first finds arrive overnight"
        line="Every night the finder reads the shops for the open pieces in your plan and keeps only what suits you. They are here in the morning. Until then, ask the shops for something, or look through everything they have."
        action={
          <ButtonLink href="/shop/browse" variant="quiet">
            Look through the shops
          </ButtonLink>
        }
      />
    )
  }

  const finds = feed.groups.reduce((total, group) => total + group.cards.length, 0)
  const missing = missingSizes(profile.sizes, feed.groups)

  return (
    <div>
      <div className="prose-measure">
        <p className="text-lg">{heading(feed.run, finds, feed.groups.length)}</p>
        <p className="mt-1 text-ink-2">{runLine(feed.run, feed.total, finds < feed.total)}</p>
        {missing ? (
          <p className="mt-3 text-ink-2">
            {missing}{' '}
            <Link href="/me/sizes" className="font-semibold text-accent underline decoration-accent/30 underline-offset-[0.2em]">
              Add your sizes
            </Link>
          </p>
        ) : null}
      </div>

      {feed.groups.map((group) => (
        <SlotFinds key={group.slot.id} group={group} guide={guide} />
      ))}

      {finds > 0 && feed.quietSlots > 0 && feed.run.status === 'succeeded' ? (
        <p className="caption mt-14">
          {feed.quietSlots} more {feed.quietSlots === 1 ? 'piece in your plan' : 'pieces in your plan'} had nothing good enough to
          show.
        </p>
      ) : null}
    </div>
  )
}

/** One slot: its colours, its name (a way into the plan), and its finds. */
function SlotFinds({ group, guide }: { group: FeedGroup; guide: StoredGuide | null }) {
  const { slot, cards } = group
  const headingId = `new-slot-${slot.id}`
  const colours = slot.colours.map((hex) => ({ hex, name: colourNameFor(guide, hex) }))
  return (
    <section aria-labelledby={headingId} className="mt-14 lg:mt-20">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div className="min-w-0">
          {colours.length > 0 ? <Swatches colours={colours} className="h-5 w-7" /> : null}
          <h2 id={headingId} className="headline mt-3">
            <Link href={`/style/plan/${slot.id}`} className="pressable inline-block">
              {slot.name}
            </Link>
          </h2>
        </div>
        <p className="caption shrink-0 pb-1 text-right">
          {PRIORITY_LABELS[slot.priority].title}
          {slot.status === 'candidate' ? <span className="block">One saved already</span> : null}
        </p>
      </div>
      {/* A swipe row on the phone; on a laptop, where a mouse scrolls sideways badly, a grid. */}
      <div className="scroller auto-cols-[min(70vw,19rem)] gap-4 pb-1 sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:gap-x-4 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((find) => (
          <FindCard key={find.product_id} find={find} slotName={slot.name} />
        ))}
      </div>
    </section>
  )
}

/** Clothes need a letter or dress size (or jeans) to narrow; shoes need a shoe size. */
function missingSizes(sizes: Partial<Sizes>, groups: FeedGroup[]): string | null {
  const shows = (kind: 'tops' | 'bottoms' | 'feet') => groups.some((group) => sizeGroup(group.slot.garment_type) === kind)
  const clothing = !(sizes.letter || sizes.dress || sizes.jeans || sizes.waist_cm)
  const shoes = !(sizes.shoe_eu || sizes.shoe_au)
  const garments = [
    clothing && (shows('tops') || shows('bottoms')) ? 'clothes' : null,
    shoes && shows('feet') ? 'shoes' : null,
  ].filter((item): item is string => item !== null)
  if (garments.length === 0) return null
  const sizeWords = [
    garments.includes('clothes') ? 'clothing size' : null,
    garments.includes('shoes') ? 'shoe size' : null,
  ].filter((item): item is string => item !== null)
  return `Your ${list(sizeWords)} ${sizeWords.length > 1 ? 'are' : 'is'} not on your profile yet, so ${list(garments)} show every size in stock.`
}

/** "12 finds last night, for 5 pieces in your plan." */
function heading(run: Run, finds: number, slots: number, now = new Date()): string {
  if (run.status === 'running') {
    return finds > 0 ? `${finds} ${finds === 1 ? 'find' : 'finds'} so far, and still judging.` : 'Still judging what it read.'
  }
  const when = whenSaid(run.finished_at ?? run.started_at, now)
  if (finds === 0) return run.stats.scoring ? `Nothing cleared the bar ${when}.` : `The run ${when} stopped before judging.`
  const count = `${finds} ${finds === 1 ? 'find' : 'finds'}`
  const forWhat = `for ${slots} ${slots === 1 ? 'piece' : 'pieces'} in your plan`
  return `${count} ${when}, ${forWhat}.`
}

/** "3am", "3:12am", in New Zealand time. */
function clock(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Pacific/Auckland',
  }).formatToParts(at)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  const minute = part('minute')
  return `${part('hour')}${minute === '00' ? '' : `:${minute}`}${part('dayPeriod').replace(/\./g, '').toLowerCase()}`
}

/** What the run read and when, and anything it left for the next night. */
function runLine(run: Run, total: number, capped: boolean): string {
  const zone = { timeZone: 'Pacific/Auckland' } as const
  const at = run.finished_at ?? run.started_at
  const weekday = at.toLocaleDateString('en-NZ', { weekday: 'long', ...zone })
  const time = clock(at)
  if (run.status === 'running') {
    return `Started ${weekday} at ${time}. More arrive as it goes${capped ? `, the best ${CARDS_PER_SLOT} for each piece shown` : ''}.`
  }
  const ingested = run.stats.ingested as { products?: number; retailers?: unknown[] } | undefined
  const read = ingested?.retailers
    ? `Read ${ingested.retailers.length} shops, ${(ingested.products ?? 0).toLocaleString('en-NZ')} pieces, ${weekday} at ${time}.`
    : `Checked ${weekday} at ${time}.`
  const scoring = run.stats.scoring as { needed?: number; scored?: number; skipped_for_budget?: number } | null | undefined
  const budget = run.stats.budget as { max_usd?: number; limited_by?: string } | undefined
  const counted =
    scoring && typeof scoring.needed === 'number' && typeof scoring.scored === 'number' && scoring.scored < scoring.needed
      ? `${scoring.scored.toLocaleString('en-NZ')} of ${scoring.needed.toLocaleString('en-NZ')}`
      : null
  const limit = budget?.limited_by === 'month' ? 'the month’s limit' : `the ${usdText(budget?.max_usd ?? 0)} limit`
  const partial = !scoring
    ? ' Nothing new was judged; what is waiting is judged next run.'
    : counted && (scoring.skipped_for_budget ?? 0) > 0
      ? ` It stopped at ${limit} after judging ${counted}; the rest are judged next run.`
      : counted
        ? ` It stopped after judging ${counted}; the rest are judged next run.`
        : ''
  const order = total === 0 ? '' : capped ? ` The best ${CARDS_PER_SLOT} for each piece, best first.` : ' Best first.'
  return `${read}${order}${partial}`
}
