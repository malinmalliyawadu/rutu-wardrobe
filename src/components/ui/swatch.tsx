import type { CSSProperties } from 'react'

/*
 * Her colours as flat swatches. Every swatch carries its name as
 * data-colour, which the colour tip shows under the mouse, and as its
 * accessible name.
 */

export function Swatch({
  hex,
  name,
  className = 'size-6',
}: {
  hex: string
  name?: string | null
  className?: string
}) {
  return (
    <span
      role={name ? 'img' : undefined}
      aria-label={name ?? undefined}
      aria-hidden={name ? undefined : true}
      data-colour={name ?? undefined}
      className={`swatch ${className}`}
      style={{ '--swatch': hex } as CSSProperties}
    />
  )
}

/** A few colours side by side, touching: a slot's colours, a look's palette. */
export function Swatches({
  colours,
  className = 'h-5 w-4',
}: {
  colours: { hex: string; name?: string | null }[]
  className?: string
}) {
  if (colours.length === 0) return null
  return (
    <span className="inline-flex gap-0.5">
      {colours.map((colour, index) => (
        <Swatch key={`${index}-${colour.hex}`} hex={colour.hex} name={colour.name} className={`${className} rounded-[0.25rem]`} />
      ))}
    </span>
  )
}
