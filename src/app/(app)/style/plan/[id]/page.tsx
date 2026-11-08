import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { HoldButton } from '@/components/ui/hold-button'
import { BackLink } from '@/components/ui/layout'
import { Block, Lines } from '@/components/ui/skeleton'
import { Swatch } from '@/components/ui/swatch'
import { getSlot, type Slot } from '@/lib/blueprint'
import { band, day, list } from '@/lib/format'
import { pieceForSlot } from '@/lib/pieces'
import { getProfile } from '@/lib/profile'
import { label } from '@/lib/profile-values'
import { colourNameFor, getGuide } from '@/lib/style-guide'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { Details } from '../../_components/details'
import { SlotForm } from '../../_components/slot-form'
import { ceilings, formValues, paletteSwatches } from '../../_components/slot-values'
import { StatusControl } from '../../_components/status-control'
import { RefillForm } from '../../_components/steps'
import { removeSlot } from '../actions'

export const metadata: Metadata = { title: 'A piece of your plan' }

export default function SlotPage({ params }: PageProps<'/style/plan/[id]'>) {
  return (
    <>
      <BackLink href="/style/plan">Plan</BackLink>
      <Suspense fallback={<SlotSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  )
}

async function Content({ params }: Pick<PageProps<'/style/plan/[id]'>, 'params'>) {
  await connection()
  const { id: raw } = await params
  const id = Number(raw)
  const valid = Number.isInteger(id) && id > 0
  const [slot, guide, profile, piece] = await Promise.all([valid ? getSlot(id) : null, getGuide(), getProfile(), valid ? pieceForSlot(id) : null])

  if (!slot) {
    return (
      <div className="max-w-xl">
        <h1 className="display">Not in your plan</h1>
        <p className="mt-4 text-ink-2">
          It may have been deleted, or replaced when the plan was drafted again.{' '}
          <Link href="/style/plan" className="link min-h-0">
            Back to your plan
          </Link>
          .
        </p>
      </div>
    )
  }

  const colours = slot.colours.map((hex) => ({ hex, name: colourNameFor(guide, hex) }))
  const named = colours.flatMap((colour) => (colour.name ? [colour.name] : []))

  return (
    <article className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <div className="lg:sticky lg:top-6">
        <div className="flex h-36 gap-[3px] overflow-hidden rounded-[var(--radius-tile)] sm:h-48 lg:h-auto lg:aspect-[4/5]">
          {colours.length ? (
            colours.map((colour) => <Swatch key={colour.hex} hex={colour.hex} name={colour.name ?? colour.hex} className="block h-full min-w-0 flex-1 rounded-none" />)
          ) : (
            <span className="block h-full flex-1 bg-surface" />
          )}
        </div>
        {named.length ? <p className="caption mt-2.5 first-letter:uppercase">{list(named)}</p> : null}
      </div>

      <div className="min-w-0 lg:pt-4">
        <p className="caption">
          {GARMENT_LABELS[slot.garment_type]}, {WHEN[slot.priority]}, {origin(slot)}
        </p>
        <h1 className="display mt-3">{slot.name}</h1>
        <p className="prose-measure mt-6 text-lg">{slot.why}</p>
        <Facts slot={slot} />

        <div className="mt-10 max-w-xl">
          <StatusControl key={slot.status} id={slot.id} status={slot.status} />
          {piece ? (
            <p className="mt-4 text-ink-2">
              In your closet as{' '}
              <Link href={`/closet/${piece.id}`} className="link min-h-0">
                {piece.name.toLowerCase()}
              </Link>
              .
            </p>
          ) : null}
        </div>

        {slot.status === 'retired' ? (
          <div className="mt-8 max-w-xl">
            {slot.refilled_by ? (
              <p className="text-ink-2">
                Something already took its place.{' '}
                <Link href={`/style/plan/${slot.refilled_by}`} className="link min-h-0">
                  See what
                </Link>
                .
              </p>
            ) : (
              <RefillForm id={slot.id} />
            )}
          </div>
        ) : null}

        <div className="mt-12">
          <Details title="Change the details" line="Changing a piece makes it yours: a new draft of the plan keeps it.">
            <SlotForm
              key={`${slot.id}-${slot.edited_at?.toISOString() ?? 'draft'}`}
              id={slot.id}
              initial={formValues(slot)}
              {...paletteSwatches(guide)}
              ceilings={ceilings(profile)}
            />
          </Details>
        </div>

        <div className="mt-14">
          <HoldButton action={removeSlot} label="Delete this piece" pendingLabel="Deleting" fields={<input type="hidden" name="id" value={slot.id} />} />
          <p className="mt-3 max-w-sm text-sm text-ink-3">Hold to delete. To take it out of the plan but keep a record, set it to retired instead.</p>
        </div>
      </div>
    </article>
  )
}

const WHEN: Record<Slot['priority'], string> = { 1: 'to buy first', 2: 'to buy next', 3: 'to buy in time' }

function origin(slot: Slot): string {
  const who = slot.source === 'claude' ? 'drafted by Claude' : 'added by you'
  return slot.edited_at ? `${who}, changed ${day(slot.edited_at)}` : who
}

/** Cloth, fit, sizes and what to spend, in one line each where there is something to say. */
function Facts({ slot }: { slot: Slot }) {
  const cloth = slot.fabrics.length ? list(slot.fabrics.map((fabric) => fabric.toLowerCase())) : null
  const fit = slot.fit ? `${label(slot.fit).toLowerCase()} fit` : null
  const sizes = slot.sizes.labels?.length ? `in ${slot.sizes.labels.join(' or ')}` : null
  const first = [cloth, fit, sizes].filter(Boolean).join(', ')
  const spend = band(slot.budget_min_cents, slot.budget_max_cents)
  if (!first && !spend && !slot.sizes.note) return null
  return (
    <p className="prose-measure mt-3 text-ink-2 tabular">
      {first ? `${first.charAt(0).toUpperCase()}${first.slice(1)}. ` : ''}
      {slot.sizes.note ? `${slot.sizes.note.replace(/\.$/, '')}. ` : ''}
      {spend ? `${spend}.` : ''}
    </p>
  )
}

function SlotSkeleton() {
  return (
    <div aria-hidden className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
      <Block className="h-36 sm:h-48 lg:aspect-[4/5] lg:h-auto" />
      <div className="lg:pt-4">
        <Block className="h-4 w-48" />
        <Block className="mt-4 h-14 w-4/5" />
        <div className="mt-6 max-w-md">
          <Lines count={3} />
        </div>
      </div>
    </div>
  )
}
