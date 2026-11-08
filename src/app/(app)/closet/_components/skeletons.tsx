import { ButtonLink } from '@/components/ui/layout'
import { Block, Lines } from '@/components/ui/skeleton'

import { ClosetHead, LineBone } from './head.tsx'

/*
 * The Closet's pages while they stream, each in the shape of what lands. The
 * head, its chips and its one action show at once; everything that waits on
 * the database is held back 300ms, so a quick load shows nothing at all.
 */

function ShelfHead({ width = 'w-40' }: { width?: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <Block className={`h-8 ${width}`} />
      <Block className="h-4 w-6" />
    </div>
  )
}

function Tiles({
  count = 4,
  aspect = 'aspect-[3/4]',
  round = 'rounded-[var(--radius-tile)]',
}: {
  count?: number
  aspect?: string
  round?: string
}) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={index >= 3 ? 'max-xl:hidden' : index === 2 ? 'max-lg:hidden' : ''}>
          <Block className={`${aspect} ${round}`} />
          <Block className="mt-3 h-4 w-3/4" />
          <Block className="mt-2 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function PiecesSkeleton() {
  return (
    <>
      <ClosetHead
        line={<LineBone />}
        aside={
          <ButtonLink href="/closet/new" size="small">
            Add a piece
          </ButtonLink>
        }
      />
      <ShelfHead width="w-28" />
      <Tiles />
    </>
  )
}

export function LooksSkeleton() {
  return (
    <>
      <ClosetHead line={<LineBone width="w-64" />} />
      <ShelfHead width="w-36" />
      <div aria-hidden className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className={index === 2 ? 'max-lg:hidden' : index === 1 ? 'max-sm:hidden' : ''}>
            <Block className="aspect-[4/5] rounded-[var(--radius-arch)]" />
            <Block className="mt-5 h-3.5 w-32" />
            <Block className="mt-3 h-8 w-4/5" />
            <div className="mt-4">
              <Lines count={3} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function TryOnsSkeleton() {
  return (
    <>
      <ClosetHead
        line={<LineBone width="w-44" />}
        aside={
          <ButtonLink href="/closet/try-ons/new" size="small">
            Choose pieces
          </ButtonLink>
        }
      />
      <Tiles aspect="aspect-[3/4]" round="rounded-[var(--radius-arch)]" />
    </>
  )
}

export function WornSkeleton() {
  return (
    <>
      <ClosetHead line={<LineBone width="w-60" />} />
      <ShelfHead width="w-36" />
      <Block className="mb-6 h-4 w-full max-w-xl" />
      <div aria-hidden className="grid gap-x-12 lg:grid-cols-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-4 border-b border-line py-5">
            <Block className="aspect-[3/4] w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <Block className="h-3.5 w-16" />
              <Block className="mt-2 h-5 w-3/5" />
              <Block className="mt-2 h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/** A piece or a try-on as a spread: the picture on the left, the words beside it. */
export function SpreadSkeleton({ arch = false }: { arch?: boolean }) {
  return (
    <div aria-hidden className="grid gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-16">
      <Block className={`aspect-[3/4] w-full max-w-[22rem] lg:max-w-none ${arch ? 'rounded-[var(--radius-arch)]' : ''}`} />
      <div className="lg:pt-10">
        <Block className="h-3.5 w-28" />
        <Block className="mt-4 h-14 w-4/5" />
        <div className="mt-8 max-w-md">
          <Lines count={4} />
        </div>
      </div>
    </div>
  )
}

/** The three ways in, then the photo tile. */
export function AddSkeleton() {
  return (
    <div aria-hidden className="max-w-2xl">
      <div className="flex gap-2">
        {['w-32', 'w-36', 'w-28'].map((width) => (
          <Block key={width} className={`h-10 rounded-full ${width}`} />
        ))}
      </div>
      <Block className="mt-8 aspect-[3/4] w-48" />
    </div>
  )
}

/** A group's head, then tiles to tick. */
export function ChooseSkeleton() {
  return (
    <div aria-hidden>
      <ShelfHead width="w-32" />
      <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div key={tile} className={tile >= 3 ? 'max-sm:hidden' : ''}>
            <Block className="aspect-[3/4]" />
            <Block className="mt-2 h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
