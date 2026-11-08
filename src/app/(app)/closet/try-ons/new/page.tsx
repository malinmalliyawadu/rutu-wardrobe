import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, ButtonLink, Empty, PageHead } from '@/components/ui/layout'
import { keptOutfits, outfitChoices } from '@/lib/on-me'
import { shelve } from '@/lib/pieces'
import { fullLengthPhoto, MAX_OUTFIT_PIECES } from '@/lib/try-on'

import { Chooser } from '../../_components/chooser.tsx'
import { ChooseSkeleton } from '../../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Choose pieces' }

/*
 * Choosing pieces to put on her: her saved finds first, then her pieces on
 * their shelves, as tiles to tick, and one picture made of the lot.
 */

export default function ChoosePage() {
  return (
    <>
      <BackLink href="/closet/try-ons">Try-ons</BackLink>
      <PageHead
        title="Choose pieces"
        line={`Up to ${MAX_OUTFIT_PIECES} of your pieces and saved finds, put on you in one picture. What you leave out stays as you are wearing it in your photo.`}
      />
      <Suspense fallback={<ChooseSkeleton />}>
        <Content />
      </Suspense>
    </>
  )
}

async function Content() {
  await connection()
  const [choices, photo, kept] = await Promise.all([outfitChoices(), fullLengthPhoto(), keptOutfits()])

  if (!photo) {
    return (
      <div className="max-w-2xl">
        <Empty
          title="First, a photo of you"
          line="Each picture is made from a full-length photo of you, standing, in daylight if you can."
          action={<ButtonLink href="/me/photos">Add a full-length photo</ButtonLink>}
        />
      </div>
    )
  }

  if (choices.pieces.length === 0 && choices.finds.length === 0) {
    return (
      <div className="max-w-2xl">
        <Empty
          title="Nothing to choose yet"
          line="Add the pieces you own, or save a find in the shops, and they show here."
          action={<ButtonLink href="/closet/new">Add a piece</ButtonLink>}
        />
      </div>
    )
  }

  const groups = [
    ...(choices.finds.length > 0 ? [{ title: 'Saved finds', choices: choices.finds }] : []),
    ...shelve(
      choices.pieces.map((choice) => ({ ...choice, garment_type: choice.garment_type!, worn_for: choice.worn_for ?? 'everyday' })),
    ).map((group) => ({ title: group.title, choices: group.pieces })),
  ]
  return <Chooser groups={groups} max={MAX_OUTFIT_PIECES} kept={kept} />
}
