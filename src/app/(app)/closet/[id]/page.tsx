import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'

import { ChoiceChips, SubmitButton } from '@/components/ui/form'
import { HoldButton } from '@/components/ui/hold-button'
import { OutIcon } from '@/components/ui/icons'
import { BackLink, ButtonLink, Empty, Section } from '@/components/ui/layout'
import { PiecePicture } from '@/components/ui/photos'
import { Refresh } from '@/components/ui/refresh'
import { Swatch } from '@/components/ui/swatch'
import { day, list, lookWearLine, wearLine } from '@/lib/format'
import { latestLookImages, type LookImage } from '@/lib/look-image'
import { dressable, OCCASION_LABELS, readinessAround, readPieceLooks, todayNz, type PieceLooks } from '@/lib/looks'
import { fillableSlots, getPiece, inPalette, listPieces, type Piece } from '@/lib/pieces'
import { label } from '@/lib/profile-values'
import { getGuide, type StoredGuide } from '@/lib/style-guide'
import { GARMENT_LABELS, WARMTH_LABELS } from '@/lib/wardrobe-values'
import { wearOf } from '@/lib/wear'

import { removePiece, restore, setAsidePiece } from '../actions.ts'
import { colourOf } from '../_components/colour.ts'
import { LookCard } from '../_components/look-card.tsx'
import { PieceDetails } from '../_components/piece-details.tsx'
import { MakePieceLooks } from '../_components/piece-looks.tsx'
import { formValues, paletteSwatches, sentence } from '../_components/piece-values.ts'
import { AddPhotoTile, ReplacePhoto } from '../_components/replace-photo.tsx'
import { SpreadSkeleton } from '../_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Piece' }

/*
 * A piece as a spread: its photo on the left (sticky on the laptop), and
 * beside it what it is, its name set large, how often it is worn, and its
 * details as facts that turn into the form in place. Under the spread, three
 * looks that each wear it, made on a tap; last, setting it aside or deleting
 * it, which takes a hold.
 */

export default function PiecePage({ params }: PageProps<'/closet/[id]'>) {
  return (
    <>
      <BackLink href="/closet">Closet</BackLink>
      <Suspense fallback={<SpreadSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  )
}

async function Content({ params }: Pick<PageProps<'/closet/[id]'>, 'params'>) {
  await connection()
  const { id: raw } = await params
  const id = Number(raw)
  const valid = Number.isInteger(id) && id > 0
  const [piece, guide, slots, pieces, around, wear] = await Promise.all([
    valid ? getPiece(id) : null,
    getGuide(),
    valid ? fillableSlots(id) : [],
    listPieces(),
    valid ? readPieceLooks(id) : null,
    valid ? wearOf(id) : null,
  ])

  if (!piece) {
    return (
      <div className="max-w-2xl">
        <Empty
          title="This piece is not in your closet"
          line="It may have been deleted."
          action={
            <ButtonLink href="/closet" variant="quiet">
              Back to your closet
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const colour = colourOf(piece, guide)
  const images =
    around && around.looks.length > 0 ? await latestLookImages(around.looks.map((look) => look.id)) : new Map<number, LookImage>()
  const drawing = [...images.values()].some((image) => image.status === 'making')

  return (
    <>
      <article className="grid gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-6">
          {piece.photo || piece.image ? (
            <>
              <PiecePicture
                piece={{ ...piece, colour_name: colour }}
                thumb={false}
                sizes="(min-width: 1024px) 30rem, 100vw"
                className={`block aspect-[3/4] w-full max-w-[26rem] lg:max-w-none ${piece.set_aside_at ? 'opacity-70' : ''}`}
              />
              <div className="mt-1">
                <ReplacePhoto id={piece.id} hasPhoto={piece.photo !== null} />
              </div>
            </>
          ) : (
            <AddPhotoTile id={piece.id} hex={piece.colour_hex} name={colour ?? piece.name} />
          )}
        </div>

        <div className="min-w-0 lg:pt-6">
          <p className="caption">{[GARMENT_LABELS[piece.garment_type], piece.brand].filter(Boolean).join(', ')}</p>
          <h1 className="display mt-3">{piece.name}</h1>

          {piece.set_aside_at ? (
            <div className="card mt-8 max-w-xl p-5">
              <p className="text-ink-2">Set aside on {day(piece.set_aside_at)}. Looks leave it out.</p>
              <form action={restore} className="mt-4">
                <input type="hidden" name="id" value={piece.id} />
                <SubmitButton pending="Putting it back" variant="quiet" size="small">
                  Put it back in your closet
                </SubmitButton>
              </form>
            </div>
          ) : wear ? (
            <p className="prose-measure mt-5 text-lg text-ink-2">
              {wearLine(wear)}{' '}
              {wear.offered > 0 ? (
                <Link href="/closet/worn" className="link min-h-0 text-base">
                  What you wear
                </Link>
              ) : null}
            </p>
          ) : null}

          <div className="mt-8 max-w-xl">
            <PieceDetails
              key={`${piece.id}-${piece.edited_at?.toISOString() ?? 'new'}-${piece.slot_id ?? ''}`}
              id={piece.id}
              initial={formValues(piece)}
              {...paletteSwatches(guide)}
              slots={slots}
            >
              <Facts piece={piece} colour={colour} guide={guide} />
            </PieceDetails>
          </div>
        </div>
      </article>

      {piece.set_aside_at ? null : <WaysToWear piece={piece} pieces={pieces} guide={guide} around={around} images={images} />}
      {drawing ? <Refresh /> : null}

      <Section title={piece.set_aside_at ? 'Delete it' : 'Done with it?'} className="max-w-3xl">
        <div className="grid gap-10 sm:grid-cols-2">
          {piece.set_aside_at ? null : (
            <form action={setAsidePiece} className="space-y-4">
              <input type="hidden" name="id" value={piece.id} />
              <p className="text-ink-2">Worn out, or given away. It stays on record, and looks leave it out.</p>
              {piece.slot_id && piece.slot_name ? (
                <ChoiceChips
                  name="slot_to"
                  legend={`Its plan slot, ${piece.slot_name.toLowerCase()}`}
                  options={[
                    { value: 'wanted', label: 'Find another' },
                    { value: 'retired', label: 'Retire the slot' },
                  ]}
                  defaultValue="wanted"
                />
              ) : null}
              <SubmitButton pending="Setting it aside" variant="quiet">
                Set it aside
              </SubmitButton>
            </form>
          )}
          <div className="space-y-4">
            <p className="text-ink-2">
              {piece.set_aside_at
                ? 'Gone for good, photo and all.'
                : 'Gone for good, photo and all. To keep a record, set it aside instead.'}
            </p>
            <HoldButton
              action={removePiece}
              label="Delete this piece"
              pendingLabel="Deleting"
              fields={<input type="hidden" name="id" value={piece.id} />}
            />
            <p className="caption">Hold the button to delete.</p>
          </div>
        </div>
      </Section>
    </>
  )
}

/** What a piece is worn for, when it is not every day. */
const WORN_FOR_LINE = { everyday: null, gym: 'The gym only', both: 'The gym and every day' } as const

/** The piece's details as facts, one to a row, only those that are set. */
function Facts({ piece, colour, guide }: { piece: Piece; colour: string | null; guide: StoredGuide | null }) {
  const palette = guide && piece.colour_hex ? (inPalette(piece.colour_hex, guide) ? 'In your palette' : 'Outside your palette') : null
  const rows: { term: string; value: ReactNode }[] = []
  if (piece.colour_hex || colour) {
    rows.push({
      term: 'Colour',
      value: (
        <span className="flex items-center gap-2.5">
          {piece.colour_hex ? <Swatch hex={piece.colour_hex} name={colour} className="h-6 w-5 shrink-0 rounded-[0.3125rem]" /> : null}
          <span>
            {colour ?? 'Its own colour'}
            {palette ? <span className="text-ink-3">, {palette.toLowerCase()}</span> : null}
          </span>
        </span>
      ),
    })
  } else {
    rows.push({ term: 'Colour', value: <span className="text-ink-3">No single colour</span> })
  }
  if (piece.fabric) rows.push({ term: 'Fabric', value: sentence(piece.fabric) })
  if (piece.fit) rows.push({ term: 'Fit', value: label(piece.fit) })
  if (piece.warmth) rows.push({ term: 'Warmth', value: WARMTH_LABELS[piece.warmth] })
  const worn = WORN_FOR_LINE[piece.worn_for]
  if (worn) rows.push({ term: 'Worn for', value: worn })
  if (piece.size) rows.push({ term: 'Size', value: piece.size })
  if (piece.slot_id && piece.slot_name && !piece.set_aside_at) {
    rows.push({
      term: 'In your plan',
      value: (
        <Link href={`/style/plan/${piece.slot_id}`} className="link min-h-0">
          {sentence(piece.slot_name)}
        </Link>
      ),
    })
  }
  if (piece.product_url && piece.retailer) {
    rows.push({
      term: 'From',
      value: (
        <a href={piece.product_url} target="_blank" rel="noopener noreferrer" className="link min-h-0 gap-1.5">
          {piece.retailer}
          <OutIcon className="size-4" />
        </a>
      ),
    })
  }
  if (piece.notes) rows.push({ term: 'Notes', value: <span className="whitespace-pre-line">{piece.notes}</span> })

  return (
    <dl className="border-t border-line">
      {rows.map((row) => (
        <div
          key={row.term}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)]"
        >
          <dt className="text-sm leading-6 text-ink-3">{row.term}</dt>
          <dd className="leading-6">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Three looks that each wear this piece, made on a tap; or, until it can be
 * built on, what is missing. The looks run across the page under the spread,
 * three across on the laptop.
 */
function WaysToWear({
  piece,
  pieces,
  guide,
  around,
  images,
}: {
  piece: Piece
  pieces: Piece[]
  guide: StoredGuide | null
  around: PieceLooks | null
  images: Map<number, LookImage>
}) {
  const latest = around?.latest ?? null
  const looks = around?.looks ?? []
  const ready = readinessAround(piece, pieces)
  const named = dressable([piece]).length > 0
  const gym = piece.worn_for === 'gym'
  const today = todayNz()
  const canDraw = Boolean(process.env.OPENAI_API_KEY)

  let blocked: ReactNode = null
  if (!guide) {
    blocked = (
      <>
        Looks are put together against your style guide.{' '}
        <Link href="/style/palette" className="link min-h-0">
          Draft it first
        </Link>
        .
      </>
    )
  } else if (!named) {
    blocked = 'Say what kind of piece it is under its details, and looks can be built on it.'
  } else if (!ready.ready) {
    blocked = ready.gym
      ? `To build gym fits on it, mark ${list(ready.missing)} as gym kit.`
      : `To build looks on it, add ${list(ready.missing)}.`
  }

  return (
    <Section title="Ways to wear it" aside={latest && looks.length > 0 ? `Made ${day(latest.created_at)}` : undefined}>
      {blocked ? (
        <p className="prose-measure text-ink-2">{blocked}</p>
      ) : (
        <>
          <p className="prose-measure mb-5 text-ink-2">
            {looks.length > 0
              ? latest?.note
                ? `Three ${gym ? 'gym fits' : 'looks'} around it, for “${latest.note}”.`
                : `Three ${gym ? 'gym fits' : 'looks'} around it, from the rest of your closet.`
              : `Three ${gym ? 'gym fits' : 'looks'} around it, from the rest of your closet, each worn a different way.`}
          </p>
          <MakePieceLooks id={piece.id} again={looks.length > 0} gym={gym} />
        </>
      )}
      {looks.length > 0 ? (
        <ul className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <li key={look.id} className="flex *:w-full">
              <LookCard
                look={look}
                image={images.get(look.id) ?? null}
                today={today}
                occasion={OCCASION_LABELS[look.occasion]}
                wornLine={lookWearLine(look)}
                canDraw={canDraw}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}
