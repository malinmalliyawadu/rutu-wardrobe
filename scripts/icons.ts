/*
 * Draws the app's icons: the dressing-room mirror, the one shape the app
 * owns (docs/design.md), as a petal arch with a rose inner edge on the
 * aubergine night ground. Run once after a change, and commit the PNGs; the
 * build never draws them, since it runs with the network off and has no
 * business doing image work.
 *
 *   node scripts/icons.ts
 *
 * Writes public/icons/ (the manifest's icons, the maskable one with the
 * mirror inside Android's safe circle), src/app/apple-icon.png (Next links
 * it as the apple-touch-icon) and src/app/icon.svg (the browser tab). iOS
 * fills a transparent corner with black, so every icon here is opaque.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const GROUND = '#1d1220'
const PETAL = '#f6e7e4'
const ROSE = '#c4577f'

/**
 * The mirror in a 1024 square. `height` is the share of the square the arch
 * spans: most of it for the home-screen icon, less for the maskable one,
 * whose edge Android may crop to a circle.
 */
export function mirrorSvg({ height = 0.7, corner = 0 }: { height?: number; corner?: number } = {}): string {
  const h = 1024 * height
  const w = h * 0.68
  const x = (1024 - w) / 2
  const y = (1024 - h) / 2
  const foot = w * 0.06
  // An arch: a semicircle over straight sides, the foot's corners barely rounded.
  const arch = (left: number, top: number, width: number, bottom: number) => {
    const radius = width / 2
    return `M${left} ${bottom - foot} V${top + radius} A${radius} ${radius} 0 0 1 ${left + width} ${top + radius} V${bottom - foot} Q${left + width} ${bottom} ${left + width - foot} ${bottom} H${left + foot} Q${left} ${bottom} ${left} ${bottom - foot} Z`
  }
  const inset = w * 0.11
  const stroke = Math.max(8, w * 0.035)
  // A glint on the glass, up the left of the arch's head, as the tab icon has.
  const gr = (w - inset * 2) / 2 - inset * 0.9
  const cx = x + w / 2
  const cy = y + inset + (w - inset * 2) / 2
  const glint = `M${cx - gr} ${cy + gr * 0.15} A${gr} ${gr} 0 0 1 ${cx - gr * 0.42} ${cy - gr * 0.9}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="${corner}" fill="${GROUND}" />
  <path d="${arch(x, y, w, y + h)}" fill="${PETAL}" />
  <path d="${arch(x + inset, y + inset, w - inset * 2, y + h - inset)}" fill="none" stroke="${ROSE}" stroke-width="${stroke}" />
  <path d="${glint}" fill="none" stroke="${ROSE}" stroke-width="${stroke}" stroke-linecap="round" />
</svg>`.replace(/\b(\d+\.\d{2})\d+/g, '$1')
}

async function png(svg: string, size: number, file: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const buffer = await sharp(Buffer.from(svg)).resize(size, size).flatten({ background: GROUND }).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(file, buffer)
  console.log(`${file} ${size}x${size}`)
}

if (import.meta.main) {
  const root = path.resolve(import.meta.dirname, '..')
  const full = mirrorSvg()
  // Android's maskable safe zone is the centre circle of 80% diameter; the arch stays inside it.
  const maskable = mirrorSvg({ height: 0.56 })
  await png(full, 192, path.join(root, 'public/icons/icon-192.png'))
  await png(full, 512, path.join(root, 'public/icons/icon-512.png'))
  await png(maskable, 512, path.join(root, 'public/icons/maskable-512.png'))
  await png(full, 180, path.join(root, 'src/app/apple-icon.png'))
  // The browser tab: the mirror larger in a rounded square, since a tab icon is 16 to 32 pixels.
  await writeFile(path.join(root, 'src/app/icon.svg'), mirrorSvg({ height: 0.84, corner: 200 }))
  console.log('src/app/icon.svg')
}
