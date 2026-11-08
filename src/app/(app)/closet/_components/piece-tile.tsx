import Link from 'next/link'

import { PiecePicture } from '@/components/ui/photos'
import { Swatch } from '@/components/ui/swatch'
import type { Piece } from '@/lib/pieces'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

/*
 * One piece on a shelf: its photo filling a 3:4 tile (or the shop's photo on
 * the sweep, or its colour with what it is written on it), its name, and its
 * colour as a small swatch and a word. The whole tile is the link; the photo
 * lifts a little under the mouse.
 */

export const TILE_SIZES = '(min-width: 1280px) 18rem, (min-width: 1024px) 24rem, 45vw'

export function PieceTile({ piece, colour }: { piece: Piece; colour: string | null }) {
  const pictured = piece.photo !== null || piece.image !== null
  return (
    <Link href={`/closet/${piece.id}`} className="pressable lift group block">
      <PiecePicture
        piece={{ ...piece, colour_name: colour }}
        label={pictured ? undefined : GARMENT_LABELS[piece.garment_type]}
        sizes={TILE_SIZES}
        className="block aspect-[3/4] w-full"
      />
      <span className="title mt-3 line-clamp-2 block">{piece.name}</span>
      <span className="caption mt-1 flex min-w-0 items-center gap-1.5">
        {piece.colour_hex ? <Swatch hex={piece.colour_hex} className="size-3 shrink-0 rounded-[0.1875rem]" /> : null}
        <span className="truncate">{[colour, piece.brand].filter(Boolean).join(', ') || GARMENT_LABELS[piece.garment_type]}</span>
      </span>
    </Link>
  )
}
