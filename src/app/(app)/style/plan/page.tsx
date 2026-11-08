import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { ButtonLink, Empty } from '@/components/ui/layout'
import { Block } from '@/components/ui/skeleton'
import { Swatch } from '@/components/ui/swatch'
import { isKeptOnRedraft, listSlots, type Slot } from '@/lib/blueprint'
import { getProfile } from '@/lib/profile'
import { getGuide, type StoredGuide } from '@/lib/style-guide'
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/wardrobe-values'

import { SlotGroup, SlotLink } from '../_components/slot-group'
import { toFindBand, toRow } from '../_components/slot-values'
import { DraftForm, RefillForm } from '../_components/steps'
import { StyleHead } from '../_components/style-head'

export const metadata = { title: 'Plan' }

/**
 * What to own, by priority: the plan Claude drafts from her palette, in the
 * order to buy it. The shops are searched for every piece she still wants.
 */
export default function PlanPage() {
  return (
    <>
      <StyleHead line="What to own, in the order to buy it. The shops are searched every night for each piece you still want." />
      <Suspense fallback={<PlanSkeleton />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await connection()
  const [profile, guide, slots] = await Promise.all([getProfile(), getGuide(), listSlots()])

  if (!guide) {
    return (
      <Empty
        title="First, your palette"
        line={
          profile.confirmed_at
            ? 'Your plan is drafted from your palette, your shapes and your fits. Draft those first.'
            : 'Your plan is drafted from your palette, and your palette from your colouring. Start there.'
        }
        action={profile.confirmed_at ? <ButtonLink href="/style/palette">Your palette</ButtonLink> : <ButtonLink href="/me/colouring">Your colouring</ButtonLink>}
      />
    )
  }

  if (slots.length === 0) {
    return (
      <section className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-16">
        <div className="max-w-xl">
          <h2 className="headline">Draft your plan</h2>
          <p className="mt-3 text-ink-2">
            Claude drafts your whole wardrobe from your profile and palette: thirty or so pieces, in the order to buy them, each with why it
            earns its place and what to spend. You can change, reorder, retire or add to any of it.
          </p>
          <div className="mt-6">
            <DraftForm replaces={0} first />
          </div>
        </div>
        <PaletteNote guide={guide} />
      </section>
    )
  }

  const active = slots.filter((slot) => slot.status !== 'retired')
  const retired = slots.filter((slot) => slot.status === 'retired')
  const owned = active.filter((slot) => slot.status === 'owned').length
  const rest = toFindBand(active)
  const replaces = slots.filter((slot) => !isKeptOnRedraft(slot)).length

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16 xl:gap-24">
      <div className="min-w-0">
        <p className="headline tabular">
          {active.length} {active.length === 1 ? 'piece' : 'pieces'}
          {owned ? `, ${owned} already yours` : ''}
        </p>
        {rest ? (
          <p className="mt-2 text-ink-2 tabular">
            The {owned ? 'rest comes' : 'whole plan comes'} to {rest.startsWith('Up to') ? rest.toLowerCase() : `about ${rest}`}.
          </p>
        ) : null}

        <div className="mt-12 lg:mt-16">
          {PRIORITIES.map((priority) => {
            const group = active.filter((slot) => slot.priority === priority)
            if (group.length === 0) return null
            return (
              <SlotGroup
                key={priority}
                title={PRIORITY_LABELS[priority].title}
                hint={PRIORITY_LABELS[priority].hint}
                summary={groupSummary(group)}
                rows={group.map((slot) => toRow(slot, guide))}
              />
            )
          })}
        </div>

        {retired.length > 0 ? <Retired slots={retired} guide={guide} /> : null}
      </div>

      <aside className="mt-16 lg:sticky lg:top-6 lg:mt-1 lg:self-start">
        <PaletteNote guide={guide} />
        <div className="mt-10">
          <h2 className="title">Something missing?</h2>
          <p className="mt-1 text-sm text-ink-2">A piece you want that the draft left out, or one you own that the plan should build around.</p>
          <ButtonLink href="/style/plan/new" variant="quiet" size="small" className="mt-4">
            Add a piece
          </ButtonLink>
        </div>
        <div className="mt-10">
          <h2 className="title">Draft it again</h2>
          <p className="mt-1 mb-4 text-sm text-ink-2">Claude drafts the plan again from your profile and palette as they are now.</p>
          <DraftForm replaces={replaces} first={false} />
        </div>
      </aside>
    </div>
  )
}

/** The palette the plan is drawn from, small, as the way to it. */
function PaletteNote({ guide }: { guide: StoredGuide }) {
  const colours = [...guide.palette.best, ...guide.palette.neutrals]
  return (
    <Link href="/style/palette" className="pressable group mt-12 block lg:mt-0" aria-label="Your palette">
      <span className="flex gap-[3px]">
        {colours.slice(0, 15).map((colour) => (
          <Swatch key={colour.hex} hex={colour.hex} name={colour.name} className="block h-9 min-w-0 flex-1 rounded-t-full rounded-b-[2px]" />
        ))}
      </span>
      <span className="caption mt-2 block">Drawn from your palette</span>
    </Link>
  )
}

/** "11 pieces, 9 to find, about $1,850 to $3,200". */
function groupSummary(slots: Slot[]): string {
  const toFind = slots.filter((slot) => slot.status === 'wanted' || slot.status === 'candidate').length
  const parts = [`${slots.length} ${slots.length === 1 ? 'piece' : 'pieces'}`]
  if (toFind !== slots.length) parts.push(`${toFind} to find`)
  const band = toFindBand(slots)
  if (band) parts.push(band.startsWith('Up to') ? band.toLowerCase() : `about ${band}`)
  return parts.join(', ')
}

function Retired({ slots, guide }: { slots: Slot[]; guide: StoredGuide }) {
  return (
    <section aria-labelledby="retired" className="mt-16 lg:mt-24">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="retired" className="headline">
          Retired
        </h2>
        <p className="caption tabular">
          {slots.length} {slots.length === 1 ? 'piece' : 'pieces'}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-2">Out of the plan. Refill one and Claude proposes what takes its place.</p>
      <ul className="mt-3 border-t border-line">
        {slots.map((slot) => (
          <li key={slot.id} className="border-b border-line">
            <SlotLink row={toRow(slot, guide)} muted />
            <div className="-mt-2 pb-4 pl-[3.25rem] sm:pl-[4.25rem]">
              {slot.refilled_by ? (
                <Link href={`/style/plan/${slot.refilled_by}`} className="link text-sm">
                  See what took its place
                </Link>
              ) : (
                <RefillForm id={slot.id} compact />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PlanSkeleton() {
  return (
    <div aria-hidden className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16 xl:gap-24">
      <div>
        <Block className="h-9 w-72 max-w-full" />
        <Block className="mt-3 h-4 w-80 max-w-full" />
        <Block className="mt-16 h-8 w-40" />
        <div className="mt-6 space-y-6">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex gap-4">
              <Block className="h-12 w-12" />
              <div className="flex-1">
                <Block className="h-5 w-2/3" />
                <Block className="mt-2 h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Block className="mt-12 h-9 w-full lg:mt-0" />
    </div>
  )
}
