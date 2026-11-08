/*
 * Loading shapes in the surface colour, held back 300ms (.delayed) so a quick
 * load shows nothing at all. They take the space the content will, so nothing
 * moves when it lands.
 */

export function Block({ className }: { className: string }) {
  return <div aria-hidden className={`skeleton delayed ${className}`} />
}

export function Lines({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="delayed space-y-2.5">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`skeleton h-4 ${index === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

/** A grid of product tiles: 2 across on the phone, 3 at lg, 4 at xl. */
export function TileGrid({ count = 8 }: { count?: number }) {
  return (
    <div aria-hidden className="delayed grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="skeleton aspect-[4/5]" />
          <div className="skeleton mt-3 h-4 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}
