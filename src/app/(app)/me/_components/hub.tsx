import { connection } from 'next/server'
import type { CSSProperties } from 'react'

import { PageHead, RowLink } from '@/components/ui/layout'
import { Swatches } from '@/components/ui/swatch'
import { parseStoredAnalysis } from '@/lib/analysis'
import { db } from '@/lib/db'
import { getFinderSettings, getSpend, usdText } from '@/lib/finder/settings'
import { day, list } from '@/lib/format'
import { listPhotos, type Photo } from '@/lib/photos'
import { getProfile, type Profile } from '@/lib/profile'
import { WEEKDAY_SHORT } from '@/lib/profile-values'
import { listRetailers, walkedNightly } from '@/lib/retailers'
import { SEASON_INFO, seasonName } from '@/lib/seasons'

/*
 * The hub's parts. Each row says in one line what is saved, in her words
 * ("S, AU 10, jeans 27, EU 38"), or, while nothing is, the one thing to do.
 */

export async function HubHead() {
  await connection()
  const profile = await getProfile()
  const analysis = parseStoredAnalysis(profile.analysis)
  const season = profile.confirmed_at ? profile.season : null

  const line = season
    ? `${seasonName(season)}, confirmed on ${day(profile.confirmed_at!)}. What you save here shapes what the mirror dresses you in and what the shops bring you.`
    : analysis
      ? `Your read is in: ${seasonName(analysis.colouring.season.value)}. Look it over and confirm it, and the rest follows from it.`
      : 'Start with your height and a few photos. Your colouring is read from them, and everything else follows from that.'

  return (
    <PageHead
      title="Me"
      line={line}
      aside={
        season ? <SeasonRibbon colours={SEASON_INFO[season].swatches} label={`${seasonName(season)} palette`} /> : null
      }
    />
  )
}

export function HubHeadSkeleton() {
  return <PageHead title="Me" line={<span aria-hidden className="skeleton delayed block h-5 w-72 max-w-full" />} />
}

/** Her season's six colours, each cut with an arched head: the palette ribbon, set larger. */
function SeasonRibbon({ colours, label }: { colours: { hex: string; name: string }[]; label: string }) {
  return (
    <div role="img" aria-label={`${label}: ${colours.map((colour) => colour.name).join(', ')}`} className="flex gap-1">
      {colours.map((colour) => (
        <span
          key={colour.hex}
          data-colour={colour.name}
          className="swatch block h-14 w-6 rounded-b-[2px] rounded-t-full lg:h-20 lg:w-8"
          style={{ '--swatch': colour.hex } as CSSProperties}
        />
      ))}
    </div>
  )
}

export async function ProfileRows() {
  await connection()
  const [profile, photos] = await Promise.all([getProfile(), listPhotos()])
  const analysis = parseStoredAnalysis(profile.analysis)
  const season = profile.confirmed_at ? profile.season : null
  const portraits = photos.filter((photo) => photo.kind !== 'reference')

  const colouring = season
    ? `${seasonName(season)}, confirmed on ${day(profile.confirmed_at!)}`
    : analysis
      ? `${seasonName(analysis.colouring.season.value)} proposed, waiting for you to confirm`
      : portraits.length
        ? 'Ready to read from your photos'
        : 'Read from your photos, once they are in'

  return (
    <nav aria-label="Your profile">
      <RowLink
        href="/me/photos"
        title="Photos"
        line={photosLine(portraits, profile.height_cm)}
        aside={portraits.length ? <Thumbs photos={portraits.slice(0, 3)} /> : null}
      />
      <RowLink
        href="/me/colouring"
        title="Colouring and proportions"
        line={colouring}
        aside={season ? <Swatches colours={SEASON_INFO[season].swatches.slice(0, 4)} className="h-5 w-3" /> : null}
      />
      <RowLink href="/me/sizes" title="Sizes" line={sizesLine(profile) ?? 'Add your sizes, so finds come in them'} />
      <RowLink
        href="/me/week"
        title="Your week"
        line={weekLine(profile) ?? 'Say how your days go, so outfits suit them'}
      />
      <RowLink
        href="/me/taste"
        title="Taste"
        line={tasteLine(profile) ?? 'Say what you love and what you never wear'}
      />
      <RowLink
        href="/me/budget"
        title="Budget"
        line={budgetLine(profile) ?? 'Set what you would spend on a piece'}
      />
    </nav>
  )
}

export async function FinderRow() {
  await connection()
  const [settings, spend, stores] = await Promise.all([getFinderSettings(), getSpend(), listRetailers(db())])
  const walked = stores.filter(walkedNightly)
  const on = walked.filter((store) => store.enabled).length
  const parts = [
    settings.max_usd_per_run > 0 ? `${usdText(settings.max_usd_per_run)} a night` : 'Judging is off',
    `${usdText(round(spend.thisMonth))} this month`,
    walked.length === 0
      ? 'shops added on the first run'
      : on === walked.length
        ? allShops(walked.length)
        : `${on} of ${walked.length} shops`,
  ]
  return (
    <nav aria-label="The finder">
      <RowLink href="/me/finder" title="The finder" line={parts.join(', ')} />
    </nav>
  )
}

/** The row titles at once, the lines as shapes until the profile is read. */
export function RowsSkeleton({ titles }: { titles: string[] }) {
  return (
    <ul aria-hidden>
      {titles.map((title, index) => (
        <li key={title} className="flex min-h-16 items-center border-b border-line py-4 last:border-b-0">
          <span className="min-w-0 flex-1">
            <span className="title block">{title}</span>
            <span className={`skeleton delayed mt-1.5 block h-3.5 ${WIDTHS[index % WIDTHS.length]}`} />
          </span>
        </li>
      ))}
    </ul>
  )
}

const WIDTHS = ['w-44', 'w-56', 'w-40', 'w-52', 'w-36', 'w-48']

/** Small arches of her photos, overlapping like prints laid on a table. */
function Thumbs({ photos }: { photos: Photo[] }) {
  return (
    <span className="flex -space-x-2">
      {photos.map((photo) => (
        <span key={photo.id} className="arch block h-10 w-8 shadow-[0_0_0_2px_var(--ground)]">
          {/* Her own photos come through /photos, never the image optimiser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/photos/${photo.id}?v=thumb`} alt="" width={32} height={40} className="size-full object-cover" />
        </span>
      ))}
    </span>
  )
}

function photosLine(photos: Photo[], heightCm: number | null): string {
  const faces = photos.filter((photo) => photo.kind === 'face').length
  const bodies = photos.filter((photo) => photo.kind === 'full_body').length
  if (faces + bodies === 0)
    return heightCm ? `${heightCm} cm, no photos yet` : 'Start here: your height and a few photos'
  const parts = [faces ? `${faces} of your face` : null, bodies ? `${bodies} full length` : null].filter(
    (part): part is string => part !== null,
  )
  return `${heightCm ? `${heightCm} cm, ` : ''}${list(parts)}`
}

/** "167 cm, S, AU 10, jeans 27, EU 38" */
export function sizesLine(profile: Profile): string | null {
  const { letter, dress, jeans, shoe_eu, shoe_au } = profile.sizes
  const parts = [
    profile.height_cm ? `${profile.height_cm} cm` : null,
    letter ?? null,
    dress ? `AU ${dress}` : null,
    jeans ? `jeans ${jeans}` : null,
    shoe_eu ? `EU ${shoe_eu}` : shoe_au ? `shoe ${shoe_au}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length ? parts.join(', ') : null
}

/** "4 days at work, the gym on Mon, Wed and Fri, out 2 evenings" */
function weekLine(profile: Profile): string | null {
  const { office, gym, gym_days, running, evenings_out } = profile.life
  const parts = [
    office ? `${count(office, 'day')} at work` : null,
    gym_days?.length
      ? `the gym on ${list(gym_days.map((weekday) => WEEKDAY_SHORT[weekday]))}`
      : gym
        ? `the gym ${count(gym, 'day')}`
        : null,
    running ? `running ${count(running, 'day')}` : null,
    evenings_out ? `out ${count(evenings_out, 'evening')}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length ? parts.join(', ') : null
}

function tasteLine(profile: Profile): string | null {
  const text = profile.taste.references ?? profile.taste.owned ?? profile.taste.no_gos
  if (!text) return null
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= 64) return flat
  return `${flat.slice(0, 64).replace(/\s+\S*$/, '')}…`
}

/** "$200 a month, dresses to $250, shoes to $300" */
function budgetLine(profile: Profile): string | null {
  const { monthly, dresses, outerwear, shoes } = profile.budget
  const parts = [
    monthly ? `$${monthly.toLocaleString('en-NZ')} a month` : null,
    dresses ? `dresses to $${dresses.toLocaleString('en-NZ')}` : null,
    shoes ? `shoes to $${shoes.toLocaleString('en-NZ')}` : null,
    outerwear && !(dresses && shoes) ? `coats to $${outerwear.toLocaleString('en-NZ')}` : null,
  ].filter((part): part is string => part !== null)
  if (parts.length) return parts.join(', ')
  const any = Object.entries(profile.budget).some(([, value]) => typeof value === 'number' && value > 0)
  return any ? 'Ceilings set for some pieces' : null
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

function allShops(total: number): string {
  return total === 1 ? 'its one shop' : total === 2 ? 'both shops' : `all ${total} shops`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
