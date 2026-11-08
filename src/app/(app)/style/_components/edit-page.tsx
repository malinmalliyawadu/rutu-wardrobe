import Link from 'next/link'
import type { ReactNode } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { Block } from '@/components/ui/skeleton'

/*
 * A page that changes one part of her guide: the way back to the palette,
 * the part's name, what it covers, then its form.
 */

export function EditPage({ title, line, children }: { title: ReactNode; line?: ReactNode; children: ReactNode }) {
  return (
    <>
      <BackLink href="/style/palette">Palette</BackLink>
      <PageHead title={title} line={line} />
      {children}
    </>
  )
}

export function NoGuide() {
  return (
    <p className="text-ink-2">
      There is no palette to change yet.{' '}
      <Link href="/style/palette" className="link min-h-0">
        Draft it first
      </Link>
      .
    </p>
  )
}

/** A form's shape while it loads: a few fields and the button. */
export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="max-w-2xl space-y-8">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <Block className="h-4 w-32" />
          <Block className="mt-2 h-12 w-full rounded-[var(--radius-control)]" />
        </div>
      ))}
      <Block className="h-12 w-40 rounded-[var(--radius-control)]" />
    </div>
  )
}
