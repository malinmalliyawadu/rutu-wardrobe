import type { Piece } from '@/lib/pieces'
import { colourNameFor, type StoredGuide } from '@/lib/style-guide'

import { sentence } from './piece-values.ts'

/** A piece's colour as she would say it: the guide's name for it, else what was typed. Server only. */
export function colourOf(piece: Pick<Piece, 'colour_hex' | 'colour_name'>, guide: StoredGuide | null): string | null {
  const named = piece.colour_hex ? colourNameFor(guide, piece.colour_hex) : null
  return named ?? (piece.colour_name ? sentence(piece.colour_name) : null)
}
