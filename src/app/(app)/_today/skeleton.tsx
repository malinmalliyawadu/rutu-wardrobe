import { Block, Lines } from '@/components/ui/skeleton'

/** The spread's shape while the day is read: the arch on the left, the words beside it. */
export function DaySkeleton() {
  return (
    <div aria-hidden className="lg:grid lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:gap-16">
      <Block className="aspect-[4/5] rounded-[var(--radius-arch)]" />
      <div className="mt-8 lg:mt-24">
        <Block className="h-4 w-40" />
        <Block className="mt-4 h-14 w-4/5" />
        <div className="mt-6 max-w-md">
          <Lines count={3} />
        </div>
      </div>
    </div>
  )
}
