import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, ButtonLink, Empty, PageHead } from '@/components/ui/layout'
import { Block, Lines } from '@/components/ui/skeleton'
import { parseStoredAnalysis } from '@/lib/analysis'
import { day } from '@/lib/format'
import { getProfile } from '@/lib/profile'

import { ColouringForm, type Saved } from '../_components/colouring-form'

export const metadata = { title: 'Colouring and proportions' }

/**
 * Claude's read of her photos, to confirm or correct: her season and
 * colouring, then her proportions, each line with why and how sure. What she
 * confirms is what the palette, the style guide and every outfit build on.
 */
export default function ColouringPage() {
  return (
    <>
      <BackLink href="/me">Me</BackLink>
      <Suspense fallback={<ColouringSkeleton />}>
        <Colouring />
      </Suspense>
    </>
  )
}

async function Colouring() {
  await connection()
  const profile = await getProfile()
  const analysis = parseStoredAnalysis(profile.analysis)
  const confirmed = profile.confirmed_at !== null

  if (!analysis && !confirmed) {
    return (
      <>
        <PageHead title="Colouring and proportions" />
        <div className="max-w-2xl">
          <Empty
            title="No read yet"
            line="Add your height and a photo of your face, and Claude reads your colouring and proportions from them, with why and how sure for each."
            action={<ButtonLink href="/me/photos">Add your photos</ButtonLink>}
          />
        </div>
      </>
    )
  }

  // A newer read than the confirmation is what she is asked about; otherwise
  // the form starts from what she confirmed.
  const fresh = analysis && (!profile.confirmed_at || (profile.analysed_at && profile.analysed_at > profile.confirmed_at))
  const saved: Saved =
    fresh || !confirmed
      ? {
          season: analysis!.colouring.season.value,
          undertone: analysis!.colouring.undertone.value,
          skin_depth: analysis!.colouring.skin_depth.value,
          contrast_level: analysis!.colouring.contrast_level.value,
          hair_colour: analysis!.colouring.hair_colour.value,
          hair_texture: analysis!.colouring.hair_texture.value,
          eye_colour: analysis!.colouring.eye_colour.value,
          build: analysis!.proportions.build.value,
          waist_definition: analysis!.proportions.waist_definition.value,
          shoulder_hip: analysis!.proportions.shoulder_hip.value,
          torso_leg: analysis!.proportions.torso_leg.value,
          neck_length: analysis!.proportions.neck_length.value,
        }
      : {
          season: profile.season,
          undertone: profile.undertone,
          skin_depth: profile.skin_depth,
          contrast_level: profile.contrast_level,
          hair_colour: profile.hair_colour,
          hair_texture: profile.hair_texture,
          eye_colour: profile.eye_colour,
          build: profile.build,
          waist_definition: profile.waist_definition,
          shoulder_hip: profile.shoulder_hip,
          torso_leg: profile.torso_leg,
          neck_length: profile.neck_length,
        }

  const line = fresh
    ? `Read on ${day(profile.analysed_at!)}. Each line is Claude’s pick, why, and how sure it was. Change what you know to be wrong, then confirm.`
    : confirmed
      ? `Confirmed on ${day(profile.confirmed_at!)}. Change anything that is not right and confirm again.`
      : null

  return (
    <>
      <PageHead title="Colouring and proportions" line={line} />
      {analysis ? (
        <div className="mb-14 grid gap-8 lg:mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
          <p className="prose-measure text-lg text-ink">{analysis.summary}</p>
          {analysis.photo_notes.length > 0 ? (
            <div>
              <p className="caption">About the photos</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                {analysis.photo_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <ColouringForm
        key={`${profile.analysed_at?.getTime() ?? 0}-${profile.confirmed_at?.getTime() ?? 0}`}
        saved={saved}
        analysis={analysis}
        confirmed={confirmed}
      />
    </>
  )
}

function ColouringSkeleton() {
  return (
    <div aria-hidden>
      <Block className="h-14 w-full max-w-xl" />
      <div className="mt-4 max-w-md">
        <Lines count={2} />
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <Block className="h-44 sm:h-56" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 12 }, (_, index) => (
            <Block key={index} className="h-15 rounded-[var(--radius-control)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
