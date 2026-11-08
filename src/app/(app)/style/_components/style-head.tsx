import type { ReactNode } from 'react'

import { PageHead } from '@/components/ui/layout'
import { SectionChips, type SectionLink } from '@/components/ui/sections'

/*
 * The Style tab's head: its name, a line for the section, and the three
 * sections as chips. Board is what she loves, Palette what suits her, Plan
 * what to own.
 */

const SECTIONS: SectionLink[] = [
  { href: '/style', label: 'Board' },
  { href: '/style/palette', label: 'Palette' },
  { href: '/style/plan', label: 'Plan' },
]

export function StyleHead({ line, aside }: { line?: ReactNode; aside?: ReactNode }) {
  return (
    <PageHead title="Style" line={line} aside={aside}>
      <SectionChips links={SECTIONS} label="Style" />
    </PageHead>
  )
}
