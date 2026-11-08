import type { SavedFind } from '@/lib/feed'
import { whenSaid } from '@/lib/format'
import type { SavedEvent } from '@/lib/saved-history'

import { nzd } from './product.tsx'

/*
 * The one line under a saved find that says what changed, worked out on the
 * server so "last night" is said by the clock that knows when the run was.
 * Good news is rose; the rest is quiet.
 */

export type ChangeLine = { text: string; tone: 'good' | 'quiet' }

const sizeWord = (find: SavedFind) => (find.sizeTracked ? 'in your size' : 'in stock')

function eventLine(find: SavedFind, event: SavedEvent, now: Date): ChangeLine {
  const when = whenSaid(event.at, now)
  switch (event.kind) {
    case 'cheaper':
      return { text: `Down to ${nzd(event.to)} ${when}, from ${nzd(event.from)}`, tone: 'good' }
    case 'back':
      return { text: `Back ${sizeWord(find)} ${when}`, tone: 'good' }
    case 'sold_out':
      return { text: `Sold out ${find.sizeTracked ? 'in your size ' : ''}${when}`, tone: 'quiet' }
    case 'dearer':
      return { text: `Up from ${nzd(event.from)} ${when}`, tone: 'quiet' }
  }
}

export function changeLine(find: SavedFind, now = new Date()): ChangeLine | null {
  if (find.news) return eventLine(find, find.news, now)
  if (find.inStock && find.savedNzdCents !== null && find.price.nzdCents < find.savedNzdCents) {
    return { text: `Down from ${nzd(find.savedNzdCents)} since you saved it`, tone: 'good' }
  }
  const latest = find.events[0]
  if (!latest) return null
  // Older news, still true: it came back, or it went up since saving.
  if (latest.kind === 'back' && find.inStock) {
    return { text: `Back ${sizeWord(find)} since ${whenSaid(latest.at, now).replace(/^on /, '')}`, tone: 'quiet' }
  }
  if (latest.kind === 'sold_out' && !find.inStock) return eventLine(find, latest, now)
  if (latest.kind === 'dearer' && find.inStock && find.savedNzdCents !== null && find.price.nzdCents > find.savedNzdCents) {
    return { text: `Up from ${nzd(find.savedNzdCents)} since you saved it`, tone: 'quiet' }
  }
  return null
}
