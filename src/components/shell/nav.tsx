'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType, SVGProps } from 'react'

import { BagIcon, DressFormIcon, HangerIcon, MirrorIcon, PersonIcon } from '../ui/icons.tsx'

type Tab = {
  href: '/' | '/shop' | '/closet' | '/style' | '/me'
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

/** Five tabs, by how often each is opened. */
const TABS: Tab[] = [
  { href: '/', label: 'Today', Icon: MirrorIcon },
  { href: '/shop', label: 'Shop', Icon: BagIcon },
  { href: '/closet', label: 'Closet', Icon: HangerIcon },
  { href: '/style', label: 'Style', Icon: DressFormIcon },
  { href: '/me', label: 'Me', Icon: PersonIcon },
]

export function Wordmark() {
  return (
    <Link href="/" className="pressable inline-flex min-h-11 items-center font-serif text-[1.75rem] leading-none italic tracking-[-0.02em]">
      Rutu
    </Link>
  )
}

/**
 * The tabs: a translucent bar along the bottom of the phone that the page
 * scrolls under, and a row of words in the top bar from the laptop up.
 * Switching tabs happens many times a day, so the only motion is the colour
 * change, the small arch arriving under the open tab, and press feedback.
 *
 * The pathname is request data on dynamic routes, so the layout renders Nav
 * inside Suspense with NavShell, the same bar with nothing marked, as the
 * prerendered fallback.
 */
export function Nav() {
  return <TabBar pathname={usePathname()} />
}

export function NavShell() {
  return <TabBar pathname={null} />
}

function isOpen(pathname: string | null, href: Tab['href']): boolean {
  if (pathname === null) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="tabbar fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)] lg:static lg:border-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-none lg:gap-1">
        {TABS.map(({ href, label, Icon }) => (
          <li key={href} className="min-w-0 flex-1 lg:flex-none">
            <Link
              href={href}
              aria-current={isOpen(pathname, href) ? 'page' : undefined}
              className="tab flex min-h-15 w-full flex-col items-center gap-1 pb-1.5 text-[0.6875rem] font-semibold lg:min-h-12 lg:justify-center lg:gap-1.5 lg:px-4 lg:pt-1.5 lg:pb-0 lg:text-[0.9375rem] lg:font-medium"
            >
              <span aria-hidden className="tab-mark max-lg:mb-1 max-lg:rotate-180 lg:order-last" />
              <Icon className="size-6 lg:hidden" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
