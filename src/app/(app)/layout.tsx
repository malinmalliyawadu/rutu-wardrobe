import { Suspense } from 'react'

import { ColourTip } from '@/components/shell/colour-tip'
import { Nav, NavShell, Wordmark } from '@/components/shell/nav'
import { LivePalette, PaletteRibbon } from '@/components/shell/palette'

/**
 * The frame. A top bar holds the wordmark, her palette and, from the laptop
 * up, the five tabs as words; on the phone the tabs are a bar along the
 * bottom. The page is one centred column, as wide as a spread needs. The
 * sign-in page sits outside all of this.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[82rem] items-center justify-between gap-6 px-[var(--gutter)] pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 lg:pt-5 lg:pb-5">
        <div className="flex items-center gap-4">
          <Wordmark />
          <Suspense fallback={<PaletteRibbon colours={null} />}>
            <LivePalette />
          </Suspense>
        </div>
        <Suspense fallback={<NavShell />}>
          <Nav />
        </Suspense>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-[82rem] px-[var(--gutter)] pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pt-10 lg:pb-28"
      >
        {children}
      </main>
      <ColourTip />
    </>
  )
}
