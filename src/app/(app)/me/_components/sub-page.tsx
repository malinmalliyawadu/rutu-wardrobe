import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'

import { FormSkeleton } from './form-skeleton'

/**
 * The frame of a page under Me that edits one part of her profile: the way
 * back, the name, a line only where the form needs it, then the form,
 * streamed in with the row it edits.
 */
export function SubPage({
  title,
  line,
  fallback,
  children,
}: {
  title: string
  line?: ReactNode
  fallback?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <BackLink href="/me">Me</BackLink>
      <PageHead title={title} line={line} />
      <Suspense fallback={fallback ?? <FormSkeleton />}>
        <Live>{children}</Live>
      </Suspense>
    </>
  )
}

/** Marks the subtree as request-time, so the form's defaults come from the live row. */
async function Live({ children }: { children: ReactNode }) {
  await connection()
  return children
}
