import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'

import { ButtonLink, Empty } from '@/components/ui/layout'
import { Block, Lines } from '@/components/ui/skeleton'
import { Swatch } from '@/components/ui/swatch'
import { day } from '@/lib/format'
import { getProfile } from '@/lib/profile'
import { label } from '@/lib/profile-values'
import { SEASON_INFO, seasonName } from '@/lib/seasons'
import { RULE_SECTIONS, getGuide, type GuideColour, type RuleSectionName, type StoredGuide } from '@/lib/style-guide'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { sentence } from '../_components/format'
import { METAL_HEX, SECTION_TITLES } from '../_components/guide-titles'
import { GuideStep } from '../_components/steps'
import { StyleHead } from '../_components/style-head'

export const metadata = { title: 'Palette' }

/**
 * Her style guide, opening on her colours: the best ones as the ribbon's
 * arches, set large and named, then her neutrals, what to keep from her
 * face and her metal; then the rules for shape, shoes and accessories and
 * the fits that work on her. Each part is changed on its own page.
 */
export default function PalettePage() {
  return (
    <>
      <StyleHead line="What suits you: your colours, your shapes, your fits. Your plan and the shops are held to it." />
      <Suspense fallback={<PaletteSkeleton />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await connection()
  const [guide, profile] = await Promise.all([getGuide(), getProfile()])

  if (!guide) {
    if (!profile.confirmed_at || !profile.season) {
      return (
        <Empty
          title="Your palette starts with your colouring"
          line="Add a few photos under Me and confirm the read of your colouring. Claude drafts your palette, your shapes and your fits from it."
          action={<ButtonLink href="/me/colouring">Your colouring</ButtonLink>}
        />
      )
    }
    const season = SEASON_INFO[profile.season]
    return (
      <section className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-16">
        <ul className="grid grid-cols-6 gap-2 sm:gap-3" aria-label={`${seasonName(profile.season)} colours`}>
          {season.swatches.map((colour) => (
            <li key={colour.hex}>
              <Swatch hex={colour.hex} name={colour.name} className="block aspect-[1/2] w-full rounded-[var(--radius-arch)]" />
            </li>
          ))}
        </ul>
        <div className="mt-8 lg:mt-0">
          <p className="caption">Your season</p>
          <h2 className="headline mt-1">{seasonName(profile.season)}</h2>
          <p className="mt-3 text-ink-2">
            {season.traits} Claude makes it yours: colours to shop for, neutrals, what to keep away from your face, and the shapes and fits
            for your height and build.
          </p>
          <div className="mt-6">
            <GuideStep />
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <Colours guide={guide} />
      {RULE_SECTIONS.map((name) => (
        <Rules key={name} name={name} guide={guide} />
      ))}
      <Fits guide={guide} />
      <Redraft guide={guide} />
    </>
  )
}

function Colours({ guide }: { guide: StoredGuide }) {
  const { palette } = guide
  return (
    <section aria-labelledby="colours">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="colours" className="headline">
          Your colours
        </h2>
        <Link href="/style/palette/colours" className="link text-sm">
          Change your colours
        </Link>
      </div>
      <p className="prose-measure mt-3 text-lg">{palette.summary}</p>

      {/* The ribbon beside her name, set large: one row of arches on the laptop. */}
      <ul
        className="mt-8 grid grid-cols-5 gap-x-2 gap-y-5 sm:grid-cols-6 sm:gap-x-3 sm:gap-y-6 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:gap-x-4"
        aria-label="Your best colours"
      >
        {palette.best.map((colour) => (
          <li key={colour.hex} className="min-w-0">
            <Swatch hex={colour.hex} name={colour.name} className="block aspect-[1/1.7] w-full rounded-[var(--radius-arch)]" />
            <ColourWords colour={colour} />
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        <div>
          <h3 className="caption">Your neutrals, the base of most outfits</h3>
          <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-6 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none sm:gap-x-4" aria-label="Your neutrals">
            {palette.neutrals.map((colour) => (
              <li key={colour.hex} className="min-w-0">
                <Swatch hex={colour.hex} name={colour.name} className="block aspect-[4/3] w-full rounded-[var(--radius-tile)]" />
                <ColourWords colour={colour} />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-10">
          {palette.avoid.length ? (
            <div>
              <h3 className="caption">Keep away from your face</h3>
              <ul className="mt-4 space-y-4" aria-label="Colours to keep away from your face">
                {palette.avoid.map((colour) => (
                  <li key={colour.hex} className="flex items-start gap-3">
                    <span className="relative mt-0.5 block size-10 shrink-0 overflow-hidden rounded-[0.5rem]">
                      <Swatch hex={colour.hex} name={colour.name} className="block size-full rounded-[0.5rem]" />
                      <span aria-hidden className="absolute top-1/2 left-1/2 h-[1.5px] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold first-letter:uppercase">{colour.name}</span>
                      <span className="block text-sm text-ink-2 first-letter:uppercase">{colour.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3 className="caption">Your metal</h3>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 flex w-10 shrink-0 justify-center gap-1.5">
                {(palette.metal === 'mixed' ? (['gold', 'silver'] as const) : ([palette.metal, palette.metal] as const)).map((metal, index) => (
                  <Swatch key={index} hex={METAL_HEX[metal]} name={metal} className="size-4 rounded-full" />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{label(palette.metal)}</span>
                <span className="block text-sm text-ink-2">{palette.metal_why}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ColourWords({ colour }: { colour: GuideColour }) {
  return (
    <>
      <p className="mt-2 text-[0.8125rem] leading-snug font-semibold first-letter:uppercase sm:mt-2.5 sm:text-[0.9375rem]">{colour.name}</p>
      <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-3 first-letter:uppercase max-sm:hidden">{colour.use}</p>
    </>
  )
}

/** A part of the guide as a spread on the laptop: its name and idea on the left, its rules on the right. */
function Part({ id, title, idea, edit, children }: { id: string; title: string; idea: string | null; edit: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16 scroll-mt-6 lg:mt-24 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <h2 id={`${id}-title`} className="headline">
          {title}
        </h2>
        {idea ? <p className="voice mt-3">{idea}</p> : null}
        <Link href={edit} className="link mt-1 text-sm">
          Change {title.charAt(0).toLowerCase() + title.slice(1)}
        </Link>
      </div>
      <dl className="mt-4 divide-y divide-line lg:mt-0">{children}</dl>
    </section>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 lg:first:pt-1">
      <dt className="font-semibold first-letter:uppercase">{term}</dt>
      <dd className="prose-measure text-ink-2">{children}</dd>
    </div>
  )
}

function Rules({ name, guide }: { name: RuleSectionName; guide: StoredGuide }) {
  const section = guide[name]
  return (
    <Part id={name} title={SECTION_TITLES[name]} idea={section.summary} edit={`/style/palette/${name}`}>
      {section.rules.map((rule) => (
        <Row key={rule.topic} term={rule.topic}>
          {rule.rule}
        </Row>
      ))}
    </Part>
  )
}

function Fits({ guide }: { guide: StoredGuide }) {
  return (
    <Part id="fits" title="Fits" idea="The fit labels that work on you, garment by garment. The shops' other cuts are passed over." edit="/style/palette/fits">
      {guide.fit_vocabulary.map((entry) => (
        <Row key={entry.garment} term={GARMENT_LABELS[entry.garment]}>
          <span className="block text-ink">{sentence(entry.fits.map((fit) => label(fit).toLowerCase()).join(' or '))}</span>
          {entry.note ? <span className="mt-0.5 block">{sentence(entry.note)}.</span> : null}
        </Row>
      ))}
    </Part>
  )
}

function Redraft({ guide }: { guide: StoredGuide }) {
  const when = [
    guide.generated_at ? `Drafted by Claude on ${day(guide.generated_at)}` : null,
    guide.edited_at ? `changed by you on ${day(guide.edited_at)}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <section aria-labelledby="redraft" className="mt-20 max-w-2xl lg:mt-28">
      <h2 id="redraft" className="headline">
        Draft it again
      </h2>
      <p className="mt-3 text-ink-2">
        {when ? `${when}. ` : ''}A new draft reads your profile as it is now and replaces your changes. Your plan stays as it is until you draft
        that again too.
      </p>
      <div className="mt-5">
        <GuideStep again />
      </div>
    </section>
  )
}

function PaletteSkeleton() {
  return (
    <div aria-hidden>
      <Block className="h-8 w-48" />
      <div className="mt-4 max-w-xl">
        <Lines count={2} />
      </div>
      <div className="mt-8 grid grid-cols-5 gap-x-2 gap-y-5 sm:grid-cols-6 sm:gap-x-3 lg:grid-cols-10 lg:gap-x-4">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className={index > 5 ? 'max-lg:hidden' : ''}>
            <Block className="aspect-[1/1.7] w-full rounded-[var(--radius-arch)]" />
            <Block className="mt-2.5 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
