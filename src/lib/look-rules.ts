import type { GarmentType } from './wardrobe-values.ts'

/*
 * What makes a set of pieces one whole outfit, by garment alone. Held by
 * tidyLooks on everything Claude puts together, and by the look cards when
 * she changes a look's pieces, so it lives apart from the database code and
 * can run in the browser.
 */

/** Outermost layer first, then down the body, then what is worn and carried. A look's pieces are shown in this order. */
export const LAYER_ORDER: GarmentType[] = [
  'coat', 'jacket', 'tailoring', 'knitwear', 'sweatshirt', 'shirt', 'top', 'tee', 'tank',
  'dress', 'jumpsuit', 'activewear', 'skirt', 'trousers', 'jeans', 'shorts', 'belt',
  'boots', 'heels', 'flats', 'sandals', 'sneakers', 'jewellery', 'accessory', 'bag',
]

export const TOPS: GarmentType[] = ['tee', 'tank', 'top', 'shirt', 'knitwear', 'sweatshirt']
/** A dress or a jumpsuit is a top and a bottom in one. */
export const ONE_PIECES: GarmentType[] = ['dress', 'jumpsuit']
export const BOTTOMS: GarmentType[] = ['skirt', 'trousers', 'jeans', 'shorts']
export const FOOTWEAR: GarmentType[] = ['flats', 'heels', 'sandals', 'boots', 'sneakers']
export const OUTER: GarmentType[] = ['coat', 'jacket']
export const CARRIED: GarmentType[] = ['belt', 'bag', 'jewellery', 'accessory']

/**
 * Either one dress or jumpsuit with no skirt or trousers, or at least one top
 * with exactly one skirt, pair of trousers, jeans or shorts. Tops may layer
 * over or under a dress (a knit over it, a tee under a slip). Then exactly
 * one pair of shoes, at most one coat or jacket and one blazer, at most four
 * things worn or carried (a bag, a belt, earrings and a necklace), two to
 * nine pieces in all.
 */
export function isWhole(types: GarmentType[]): boolean {
  const count = (group: GarmentType[]) => types.filter((type) => group.includes(type)).length
  const onePieces = count(ONE_PIECES)
  const body = onePieces === 1 ? count(BOTTOMS) === 0 : onePieces === 0 && count(TOPS) >= 1 && count(BOTTOMS) === 1
  return (
    body &&
    count(FOOTWEAR) === 1 &&
    count(OUTER) <= 1 &&
    count(['tailoring']) <= 1 &&
    count(CARRIED) <= 4 &&
    types.length >= 2 &&
    types.length <= 9
  )
}

/** isWhole in words, for the prompts that put outfits together. */
export const WHOLE_OUTFIT = 'either one dress or jumpsuit with no skirt or trousers, or at least one top with exactly one skirt, pair of trousers, jeans or shorts; exactly one pair of shoes; at most one coat or jacket and one blazer; at most four of jewellery, a belt, a bag and other accessories'

/**
 * Whether a look is still whole with these of its pieces (by id) left out and
 * nothing in their place. A piece whose removal fails this can only be swapped.
 */
export function wholeWithout(pieces: { id: number; garment_type: GarmentType }[], out: ReadonlySet<number>): boolean {
  return isWhole(pieces.filter((piece) => !out.has(piece.id)).map((piece) => piece.garment_type))
}

/** The longest note she can give with a remake: "lower shoes, nothing black". */
export const REMAKE_NOTE_MAX = 200
