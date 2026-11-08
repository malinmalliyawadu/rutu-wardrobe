import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { HangerIcon } from '@/components/ui/icons'
import { ButtonLink, Section } from '@/components/ui/layout'
import { PiecePicture } from '@/components/ui/photos'
import { day } from '@/lib/format'
import { inPalette, listPieces, shelve, type Piece } from '@/lib/pieces'
import { getGuide, type StoredGuide } from '@/lib/style-guide'

import { ClosetHead } from './_components/head.tsx'
import { colourOf } from './_components/colour.ts'
import { PieceTile } from './_components/piece-tile.tsx'
import { PiecesSkeleton } from './_components/skeletons.tsx'

export const metadata: Metadata = { title: 'Closet' }

/*
 * Pieces: what she owns, on shelves by kind (tops, knitwear, dresses and so
 * on), gym-only kit on a shelf of its own, then what she set aside. Each
 * shelf is a grid of tiles; each tile opens the piece.
 */

export default function PiecesPage() {
  return (
    <Suspense fallback={<PiecesSkeleton />}>
      <Pieces />
    </Suspense>
  )
}

const ADD = (
  <ButtonLink href="/closet/new" size="small">
    Add a piece
  </ButtonLink>
)

async function Pieces() {
  await connection()
  const [pieces, guide] = await Promise.all([listPieces(), getGuide()])
  const active = pieces.filter((piece) => !piece.set_aside_at)
  const aside = pieces.filter((piece) => piece.set_aside_at)

  if (active.length === 0) {
    return (
      <>
        <ClosetHead line={aside.length > 0 ? 'Everything you owned is set aside.' : 'Nothing here yet.'} />
        <FirstPieces />
        {aside.length > 0 ? <SetAside pieces={aside} guide={guide} /> : null}
      </>
    )
  }

  const count = `${active.length} ${active.length === 1 ? 'piece' : 'pieces'}`
  const palette = active.filter((piece) => inPalette(piece.colour_hex, guide)).length
  const line = guide
    ? `${count}, ${palette === active.length ? 'every one' : palette === 0 ? 'none' : palette} in your palette.`
    : `${count}.`

  return (
    <>
      <ClosetHead line={line} aside={ADD} />
      <div>
        {shelve(active).map((shelf) => (
          <Section key={shelf.title} title={shelf.title} aside={<span className="tabular">{shelf.pieces.length}</span>}>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
              {shelf.pieces.map((piece) => (
                <li key={piece.id}>
                  <PieceTile piece={piece} colour={colourOf(piece, guide)} />
                </li>
              ))}
            </ul>
          </Section>
        ))}
        {aside.length > 0 ? <SetAside pieces={aside} guide={guide} /> : null}
      </div>
    </>
  )
}

/**
 * An empty closet: four empty hangers for what a first look needs, then the
 * one way to fill them.
 */
function FirstPieces() {
  const wanted = ['A top or two', 'A skirt or trousers', 'Or a dress', 'Shoes you live in']
  return (
    <section aria-labelledby="first" className="max-w-4xl">
      <ul aria-hidden className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
        {wanted.map((label) => (
          <li key={label}>
            <div className="grid aspect-[3/4] place-items-center rounded-[var(--radius-tile)] bg-surface shadow-[inset_0_0_0_1px_var(--line)]">
              <HangerIcon className="size-8 text-ink-3 opacity-60" />
            </div>
            <p className="caption mt-2.5">{label}</p>
          </li>
        ))}
      </ul>
      <h2 id="first" className="headline mt-10">
        Start with what you wear most
      </h2>
      <p className="prose-measure mt-3 text-ink-2">
        Looks need a dress, or two tops and something below, and a pair of shoes. Take a photo of each and it fills itself in. Plan slots
        you mark owned and finds you buy arrive here on their own.
      </p>
      <ButtonLink href="/closet/new" className="mt-7">
        Add a piece
      </ButtonLink>
    </section>
  )
}

/** Worn out or given away: kept on record, small and quiet, out of every look. */
function SetAside({ pieces, guide }: { pieces: Piece[]; guide: StoredGuide | null }) {
  return (
    <Section title="Set aside" aside="Looks leave these out">
      <ul className="grid gap-x-12 sm:grid-cols-2 xl:grid-cols-3">
        {pieces.map((piece) => (
          <li key={piece.id} className="border-b border-line">
            <Link href={`/closet/${piece.id}`} className="pressable flex min-h-20 items-center gap-4 py-3">
              <PiecePicture
                piece={{ ...piece, colour_name: colourOf(piece, guide) }}
                sizes="3rem"
                className="block h-16 w-12 shrink-0 opacity-70"
              />
              <span className="min-w-0">
                <span className="block truncate text-ink-2">{piece.name}</span>
                <span className="caption mt-0.5 block">Set aside on {day(piece.set_aside_at!)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}
