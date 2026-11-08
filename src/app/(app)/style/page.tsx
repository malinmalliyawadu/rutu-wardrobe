import { connection } from 'next/server'
import { Suspense } from 'react'

import { Refresh } from '@/components/ui/refresh'
import { Block } from '@/components/ui/skeleton'
import {
  BOARD_LINE,
  SUMMARY_MIN_PINS,
  boardUsd,
  hostOf,
  latestSummary,
  listPins,
  pinColours,
  pinState,
  summaryDrift,
  type Pin,
  type StoredSummary,
} from '@/lib/board'
import { day } from '@/lib/format'
import { getProfile } from '@/lib/profile'
import { getGuide, type StoredGuide } from '@/lib/style-guide'

import { Board, type PinView } from './_components/board'
import type { NoteView } from './_components/board-note'
import { usd } from './_components/format'
import { StyleHead } from './_components/style-head'

export const metadata = { title: 'Board' }

/**
 * Her inspiration board: outfits she loves, pinned from her phone or a link,
 * each read once by Claude, and together read into what she is drawn to.
 */
export default function BoardPage() {
  return (
    <>
      <StyleHead line="Outfits you love, pinned. Claude reads each one, and together they tell your stylist what you are drawn to." />
      <Suspense fallback={<BoardSkeleton />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await connection()
  const [pins, summary, guide, profile, spent] = await Promise.all([listPins(), latestSummary(), getGuide(), getProfile(), boardUsd()])
  const views = pins.map((pin) => toView(pin, guide))
  const reading = views.some((view) => view.state === 'reading')
  const replaces = (profile.taste.references ?? '').includes(BOARD_LINE)

  return (
    <>
      <Board pins={views} note={noteFor(pins, summary, replaces)} />
      {pins.length > 0 ? (
        <p className="caption mt-10">
          {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
          {spent > 0 ? `, read for ${usd(spent)} in all` : ''}. Each picture goes to Claude once, when you pin it, and nowhere else.
        </p>
      ) : null}
      {reading ? <Refresh /> : null}
    </>
  )
}

function toView(pin: Pin, guide: StoredGuide | null): PinView {
  const { colours, ...read } = pin.read ?? { colours: [] }
  return {
    id: pin.id,
    url: pin.source_url,
    host: pin.source_url ? hostOf(pin.source_url) : null,
    title: pin.title,
    width: pin.width,
    height: pin.height,
    note: pin.note,
    read: pin.read ? (read as PinView['read']) : null,
    colours: pin.read ? pinColours({ colours }, guide) : [],
    state: pinState(pin),
    failure: pin.failure,
    cost: pin.read_at ? usd(pin.usd ?? 0) : null,
    pinned: day(pin.created_at),
  }
}

function noteFor(pins: Pin[], summary: StoredSummary | null, replaces: boolean): NoteView {
  const read = pins.filter((pin) => pin.read).length
  if (summary) {
    const { added, removed } = summaryDrift(summary, pins)
    const parts = [
      added ? `${added === 1 ? 'One pin' : `${added} pins`} read since` : null,
      removed ? `${removed === 1 ? 'one' : removed} it read ${removed === 1 ? 'is' : 'are'} gone` : null,
    ].filter(Boolean)
    const cost = usd(summary.usd)
    return {
      kind: 'summary',
      id: summary.id,
      summary: summary.summary,
      threads: summary.threads,
      line: `From ${summary.pin_ids.length} pins on ${day(summary.created_at)}${cost ? `, ${cost}` : ''}`,
      drift: parts.length ? `${parts.join(', and ')}.` : null,
      applied: summary.applied_at !== null,
      replaces,
    }
  }
  if (read < SUMMARY_MIN_PINS) return { kind: 'few', read, needed: SUMMARY_MIN_PINS }
  return { kind: 'ready', read }
}

function BoardSkeleton() {
  const ratios = ['4 / 5', '3 / 4', '1 / 1', '2 / 3', '3 / 4', '4 / 5', '5 / 6', '3 / 4']
  return (
    <div aria-hidden>
      <Block className="h-[4.5rem] rounded-[var(--radius-control)] max-sm:h-[10.5rem]" />
      <div className="mt-8 columns-2 gap-x-3 sm:gap-x-4 lg:mt-12 lg:columns-3 lg:gap-x-6 xl:columns-4">
        {ratios.map((ratio, index) => (
          <div key={index} className="mb-6 break-inside-avoid lg:mb-8">
            <div className="skeleton delayed" style={{ aspectRatio: ratio }} />
            <div className="skeleton delayed mt-2 h-3.5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
