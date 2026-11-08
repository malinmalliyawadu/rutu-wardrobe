import type { MetadataRoute } from 'next'

/**
 * What installing the app to the home screen reads. Served outside the
 * sign-in gate (see src/proxy.ts), since the phone may fetch it without the
 * cookie. The icons are drawn by scripts/icons.ts. No service worker: the
 * app is no use offline, and a cached Today would show stale prices.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Rutu',
    short_name: 'Rutu',
    description: 'A personal stylist that learns what suits Rutu and finds it in Wellington and online.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The aubergine ground the icon is drawn on, so the splash and the icon agree.
    background_color: '#1d1220',
    theme_color: '#1d1220',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
