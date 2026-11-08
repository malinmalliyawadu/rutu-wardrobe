import { Suspense } from 'react'

import { Day } from './_today/day'
import { DaySkeleton } from './_today/skeleton'

export const metadata = { title: 'Today' }

/**
 * Today is the mirror: the outfit of the day and nothing else. The picture
 * in the arch, the day it is for, the words, the one button. Until there is
 * a read, a guide and a wardrobe, it is the one next step.
 */
export default function TodayPage() {
  return (
    <Suspense fallback={<DaySkeleton />}>
      <Day />
    </Suspense>
  )
}
