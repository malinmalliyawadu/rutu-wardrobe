'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/*
 * The sections of a tab, as a row of chips under its title: Shop has New,
 * Wishlist, Statement and All shops; Closet has Pieces, Looks, Try-ons, Worn;
 * Style has Board, Palette, Plan. The open one is ink. On the phone the row
 * scrolls sideways if it must; it never wraps.
 */

export type SectionLink = {
  href: string
  label: string
  /** Pages under another path that belong to this section. */
  also?: string[]
  /** A count shown after the label. */
  count?: number | null
}

export function SectionChips({ links, label }: { links: SectionLink[]; label: string }) {
  const pathname = usePathname()
  // The longest matching href wins, so /closet does not light up on /closet/looks.
  const active = links
    .flatMap((link) => [link.href, ...(link.also ?? [])].map((path) => ({ link, path })))
    .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.link
  return (
    <nav aria-label={label} className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] [scrollbar-width:none]">
      <ul className="flex gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href as never} aria-current={link === active ? 'page' : undefined} className="chip">
              {link.label}
              {link.count ? <span className="tabular opacity-70">{link.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
