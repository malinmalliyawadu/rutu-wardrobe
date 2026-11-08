import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { Block, Lines } from '@/components/ui/skeleton'
import { day } from '@/lib/format'
import { listPhotos } from '@/lib/photos'
import { getProfile } from '@/lib/profile'

import { DeleteAll, HeightForm, PhotoShelf, ReadButton } from '../_components/photos'

export const metadata = { title: 'Your photos' }

/**
 * Her height first, then two to four photos of her (a face or two, a full
 * length or two), then the read. They stay here: Claude sees the face and
 * full-length photos once for the read, and OpenAI sees the newest full
 * length only when she asks to see something on her.
 */
export default function PhotosPage() {
  return (
    <>
      <BackLink href="/me">Me</BackLink>
      <PageHead
        title="Your photos"
        line="Daylight, no filter, hair as you wear it. They stay here, go to Claude once for the read, and a full-length one goes to OpenAI only when you ask to see something on you."
      />
      <Suspense fallback={<PhotosSkeleton />}>
        <Photos />
      </Suspense>
    </>
  )
}

async function Photos() {
  await connection()
  const [photos, profile] = await Promise.all([listPhotos(), getProfile()])
  const faces = photos.filter((photo) => photo.kind === 'face')
  const bodies = photos.filter((photo) => photo.kind === 'full_body')
  const portraits = faces.length + bodies.length

  const note =
    faces.length === 0
      ? 'Add a photo of your face to start the read.'
      : profile.height_cm === null
        ? 'Add your height first: without it, the proportion read is a guess.'
        : bodies.length === 0
          ? 'A full-length photo makes the proportion read far better. You can read without one.'
          : 'About a minute. Only your face and full-length photos are sent.'

  return (
    <div className="space-y-14 lg:space-y-20">
      <section aria-labelledby="height">
        <h2 id="height" className="headline">
          Your height
        </h2>
        <p className="prose-measure mt-2 mb-5 text-ink-2">The read places your proportions against it.</p>
        <HeightForm key={profile.height_cm ?? 'none'} heightCm={profile.height_cm} />
      </section>

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
        <PhotoShelf
          kind="face"
          title="Your face"
          hint="Facing a window, no makeup or filter. One or two."
          photos={faces}
          max={2}
        />
        <PhotoShelf
          kind="full_body"
          title="Full length"
          hint="Fitted clothes against a plain wall. The newest is used for try-ons."
          photos={bodies}
          max={2}
        />
      </div>

      <section aria-labelledby="read">
        <h2 id="read" className="headline">
          The read
        </h2>
        <p className="prose-measure mt-2 mb-6 text-ink-2">
          {profile.analysed_at ? (
            <>
              Last read on {day(profile.analysed_at)}.{' '}
              <Link href="/me/colouring" className="link inline min-h-0">
                {profile.confirmed_at ? 'See your colouring' : 'Look it over and confirm it'}
              </Link>
            </>
          ) : (
            'Your undertone, depth and contrast, your season, and how your proportions sit, each with why and how sure.'
          )}
        </p>
        <ReadButton ready={faces.length > 0} again={profile.analysed_at !== null} note={note} />
      </section>

      {photos.length > 0 ? (
        <section aria-labelledby="delete" className="max-w-xl">
          <h2 id="delete" className="sr-only">
            Delete your photos
          </h2>
          <DeleteAll count={photos.length} />
          <p className="mt-3 text-sm text-ink-3">
            Hold to delete. The try-ons of you go with them; your read and everything drawn from it stay. Removing one
            photo removes the try-ons made from it. OpenAI deletes its own copies within 30 days.
          </p>
          {portraits < photos.length ? (
            <p className="mt-2 text-sm text-ink-3">This includes reference photos from before your board.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function PhotosSkeleton() {
  return (
    <div aria-hidden className="space-y-14 lg:space-y-20">
      <div>
        <Block className="h-8 w-48" />
        <Block className="mt-4 h-12 w-56" />
      </div>
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
        {[0, 1].map((shelf) => (
          <div key={shelf}>
            <Block className="h-8 w-40" />
            <div className="mt-3 max-w-sm">
              <Lines count={2} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Block className="aspect-[3/4] rounded-[var(--radius-arch)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
