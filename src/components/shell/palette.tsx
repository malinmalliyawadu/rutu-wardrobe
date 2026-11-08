import Link from 'next/link'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'

import { getProfile } from '@/lib/profile'
import { SEASON_INFO, seasonName } from '@/lib/seasons'
import { getGuide } from '@/lib/style-guide'

/*
 * Her colours beside the wordmark on every page: five swatches cut like
 * ribbon. Undyed petal tones until there is a read, her season's colours once
 * the read is confirmed, her own once the guide is drafted. A tap opens the
 * palette; each swatch is named under the mouse.
 */

export type RibbonColour = { hex: string; name?: string }

const BLANK: RibbonColour[] = ['#ead4cf', '#dfc2bd', '#d1aea9', '#bf9893', '#a8807c'].map((hex) => ({ hex }))

export function PaletteRibbon({ colours, label = 'Your palette' }: { colours: RibbonColour[] | null; label?: string }) {
  const shown = (colours ?? BLANK).slice(0, 5)
  const names = shown.flatMap((colour) => (colour.name ? [colour.name] : []))
  const text = colours ? (names.length ? `${label}: ${names.join(', ')}` : label) : 'No palette yet'
  return (
    <Link href="/style/palette" aria-label={text} className="pressable inline-flex min-h-11 items-center gap-[3px]">
      {shown.map((colour, index) => (
        <span
          key={`${index}-${colour.hex}`}
          data-colour={colour.name}
          className="swatch block h-6 w-3 rounded-b-[1px] rounded-t-full"
          style={{ '--swatch': colour.hex } as CSSProperties}
        />
      ))}
    </Link>
  )
}

/**
 * The ribbon with her real colours. Streams in under Suspense after the
 * shell, with the blank ribbon as its fallback; the swatches are the same
 * size either way, so nothing moves when it lands.
 */
export async function LivePalette() {
  await connection()
  const [guide, profile] = await Promise.all([getGuide(), getProfile()])
  if (guide) return <PaletteRibbon colours={guide.palette.best} label="Your best colours" />
  const season = profile.confirmed_at ? profile.season : null
  if (season) return <PaletteRibbon colours={SEASON_INFO[season].swatches} label={`${seasonName(season)} palette`} />
  return <PaletteRibbon colours={null} />
}
