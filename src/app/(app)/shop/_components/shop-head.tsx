import type { ReactNode } from 'react'

import { PageHead } from '@/components/ui/layout'
import { SectionChips, type SectionLink } from '@/components/ui/sections'

/** The Shop tab's four sections. Asking the shops belongs to New, where its line is. */
const SECTIONS: SectionLink[] = [
  { href: '/shop', label: 'New', also: ['/shop/ask'] },
  { href: '/shop/wishlist', label: 'Wishlist' },
  { href: '/shop/statement', label: 'Statement' },
  { href: '/shop/browse', label: 'All shops' },
]

/**
 * A Shop section's head: its name in Bodoni, one plain line, and the chips.
 * Static, so it ships in the prerendered shell and the finds stream under it.
 */
export function ShopHead({ title, line, aside }: { title: string; line?: ReactNode; aside?: ReactNode }) {
  return (
    <PageHead title={title} line={line} aside={aside}>
      <SectionChips links={SECTIONS} label="Shop" />
    </PageHead>
  )
}
