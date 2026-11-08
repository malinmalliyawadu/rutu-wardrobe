import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import './globals.css'

/*
 * Two faces, committed under src/fonts and loaded locally so `next build`
 * never reaches out to Google; the Docker build runs with the network off.
 * Bodoni Moda (variable weight and optical size) for the few words that carry
 * a screen and the stylist's italic line; Hanken Grotesk for everything read.
 */
const bodoni = localFont({
  src: [
    { path: '../fonts/bodoni-moda-latin.woff2', weight: '400 900', style: 'normal' },
    { path: '../fonts/bodoni-moda-latin-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--font-bodoni',
  display: 'swap',
})

const hanken = localFont({
  src: [
    { path: '../fonts/hanken-grotesk-latin.woff2', weight: '100 900', style: 'normal' },
    { path: '../fonts/hanken-grotesk-latin-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-hanken',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Dressing room',
    template: '%s, Dressing room',
  },
  description: 'A personal stylist that learns what suits you and finds it in Wellington and online.',
  appleWebApp: {
    capable: true,
    title: 'Dressing room',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6e7e4' },
    { media: '(prefers-color-scheme: dark)', color: '#1d1220' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-NZ" className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="min-h-dvh bg-ground font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-ink focus:px-4 focus:py-3 focus:text-on-ink"
        >
          Skip to the page
        </a>
        {children}
      </body>
    </html>
  )
}
