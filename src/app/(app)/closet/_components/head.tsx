import type { ReactNode } from 'react'

import { PageHead } from '@/components/ui/layout'
import { SectionChips, type SectionLink } from '@/components/ui/sections'

/*
 * The head every Closet section shares: the tab's name in Bodoni, one plain
 * line of what is true now, the section's one action at the right on the
 * laptop, and the four sections as chips. The skeletons render the same head
 * with the line still to come, so nothing moves when the page lands.
 */

const SECTIONS: SectionLink[] = [
  { href: '/closet', label: 'Pieces' },
  { href: '/closet/looks', label: 'Looks' },
  { href: '/closet/try-ons', label: 'Try-ons' },
  { href: '/closet/worn', label: 'Worn' },
]

export function ClosetHead({ line, aside }: { line?: ReactNode; aside?: ReactNode }) {
  return (
    <PageHead title="Closet" line={line ?? <span className="block h-[1.55em]" aria-hidden />} aside={aside}>
      <SectionChips links={SECTIONS} label="Pieces, looks, try-ons and what you wear" />
    </PageHead>
  )
}

/** The head's line while it streams: a bone the height of the line, held back like every skeleton. */
export function LineBone({ width = 'w-56' }: { width?: string }) {
  return (
    <span aria-hidden className="flex h-[1.55em] items-center">
      <span className={`skeleton delayed block h-4 max-w-full ${width}`} />
    </span>
  )
}
