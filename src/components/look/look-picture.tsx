'use client'

import { useTransition } from 'react'

import { drawLook } from '@/app/actions/day'
import type { LookImage } from '@/lib/look-image'
import type { Look } from '@/lib/looks'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { PiecePicture } from '../ui/photos.tsx'

/*
 * A whole look, in the arch. Once OpenAI has drawn its flat lay, that fills
 * the mirror; until then, or without a key, the pieces themselves are laid
 * out inside it on the white sweep, the outermost largest.
 */

export function LookPicture({
  look,
  image,
  canDraw,
  sizes = '(min-width: 1024px) 34rem, 100vw',
  priority = false,
}: {
  look: Look
  image: LookImage | null
  canDraw: boolean
  sizes?: string
  priority?: boolean
}) {
  const drawn = image?.status === 'ready' && image.width && image.height ? image : null
  return (
    <figure>
      <div className="arch aspect-[4/5]">
        {drawn ? (
          // A private, already-sized file behind the sign-in; the optimiser would only copy it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/photos/looks/${drawn.id}`}
            alt={`${look.title}, laid out`}
            width={drawn.width ?? undefined}
            height={drawn.height ?? undefined}
            fetchPriority={priority ? 'high' : undefined}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <FlatLay look={look} sizes={sizes} />
        )}
      </div>
      <figcaption className="caption mt-3">
        {drawn ? (
          'Drawn from your pieces. Judge the colours against the pieces themselves.'
        ) : image?.status === 'making' ? (
          <span role="status">Drawing the outfit</span>
        ) : canDraw ? (
          <Draw lookId={look.id} failed={image?.status === 'failed' ? image.error : null} />
        ) : null}
      </figcaption>
    </figure>
  )
}

/**
 * The pieces inside the arch: the first (outermost) large, the next two
 * beside it, the rest, usually shoes and what is carried, along the bottom.
 * The top padding keeps every piece clear of the arch's curve.
 */
export function FlatLay({ look, sizes }: { look: Look; sizes: string }) {
  const [first, second, third, ...rest] = look.pieces
  if (!first) return null
  return (
    <div role="group" aria-label={`The pieces of ${look.title}`} className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_auto] gap-2 px-[7%] pt-[22%] pb-[6%]">
      <div className={`grid min-h-0 gap-2 ${second ? 'grid-cols-[3fr_2fr]' : 'grid-cols-1'}`}>
        <PiecePicture piece={first} label={GARMENT_LABELS[first.garment_type]} sizes={sizes} className="h-full" />
        {second ? (
          <div className={`grid min-h-0 gap-2 ${third ? 'grid-rows-2' : 'grid-rows-1'}`}>
            <PiecePicture piece={second} label={GARMENT_LABELS[second.garment_type]} sizes="12rem" className="h-full" />
            {third ? <PiecePicture piece={third} label={GARMENT_LABELS[third.garment_type]} sizes="12rem" className="h-full" /> : null}
          </div>
        ) : null}
      </div>
      {rest.length > 0 ? (
        <div className="grid h-[22%] min-h-16 gap-2" style={{ gridTemplateColumns: `repeat(${rest.length}, minmax(0, 1fr))` }}>
          {rest.map((piece) => (
            <PiecePicture key={piece.id} piece={piece} label={GARMENT_LABELS[piece.garment_type]} sizes="8rem" className="h-full" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Draw the picture, when it has none or the last one failed. */
function Draw({ lookId, failed }: { lookId: number; failed: string | null }) {
  const [pending, startTransition] = useTransition()
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      {failed ? <span>The picture could not be drawn. {failed}</span> : null}
      <button
        type="button"
        disabled={pending}
        className="link min-h-9 text-[0.8125rem]"
        onClick={() =>
          startTransition(async () => {
            await drawLook(lookId)
          })
        }
      >
        {pending ? 'Starting' : failed ? 'Draw it again' : 'Draw the outfit'}
      </button>
    </span>
  )
}

/** One look, small, for a row of options: its drawn picture, else its first piece. */
export function LookThumb({ look, image }: { look: Look; image: LookImage | null }) {
  if (image?.status === 'ready' && image.width && image.height) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/photos/looks/${image.id}`}
        alt=""
        width={image.width}
        height={image.height}
        loading="lazy"
        className="aspect-[4/5] w-full rounded-[999px_999px_0.625rem_0.625rem] bg-photo object-cover"
      />
    )
  }
  const first = look.pieces[0]
  return (
    <span aria-hidden className="arch block aspect-[4/5] w-full rounded-[999px_999px_0.625rem_0.625rem]">
      {first ? <PiecePicture piece={first} sizes="6rem" className="absolute inset-x-[12%] top-[24%] bottom-[8%]" /> : null}
    </span>
  )
}
