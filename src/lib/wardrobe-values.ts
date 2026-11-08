import type { Budget } from './profile.ts'

/**
 * The closed vocabularies of the style guide and the blueprint, shared by
 * Claude's output formats, the forms and the database check constraints in
 * db/migrations/0002_blueprint_edits.sql. The finder (M3) filters on garment
 * type, so it is a fixed list rather than free text.
 */

export const GARMENT_TYPES = [
  'tee',
  'tank',
  'top',
  'shirt',
  'knitwear',
  'sweatshirt',
  'dress',
  'jumpsuit',
  'skirt',
  'trousers',
  'jeans',
  'shorts',
  'tailoring',
  'jacket',
  'coat',
  'activewear',
  'flats',
  'heels',
  'sandals',
  'boots',
  'sneakers',
  'belt',
  'bag',
  'jewellery',
  'accessory',
] as const

export const SLOT_STATUSES = ['wanted', 'candidate', 'owned', 'retired'] as const
export const PRIORITIES = [1, 2, 3] as const
export const METALS = ['gold', 'silver', 'mixed'] as const

export type GarmentType = (typeof GARMENT_TYPES)[number]
export type SlotStatus = (typeof SLOT_STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type Metal = (typeof METALS)[number]

export const GARMENT_LABELS: Record<GarmentType, string> = {
  tee: 'Tee',
  tank: 'Tank or cami',
  top: 'Top',
  shirt: 'Shirt',
  knitwear: 'Knitwear',
  sweatshirt: 'Sweatshirt',
  dress: 'Dress',
  jumpsuit: 'Jumpsuit',
  skirt: 'Skirt',
  trousers: 'Trousers',
  jeans: 'Jeans',
  shorts: 'Shorts',
  tailoring: 'Tailoring',
  jacket: 'Jacket',
  coat: 'Coat',
  activewear: 'Activewear',
  flats: 'Flats',
  heels: 'Heels',
  sandals: 'Sandals',
  boots: 'Boots',
  sneakers: 'Sneakers',
  belt: 'Belt',
  bag: 'Bag',
  jewellery: 'Jewellery',
  accessory: 'Accessory',
}

export const STATUS_LABELS: Record<SlotStatus, string> = {
  wanted: 'Wanted',
  candidate: 'Candidate',
  owned: 'Owned',
  retired: 'Retired',
}

export const PRIORITY_LABELS: Record<Priority, { title: string; hint: string }> = {
  1: { title: 'Buy first', hint: 'The foundation. Worn most, unlocks the most outfits.' },
  2: { title: 'Next', hint: 'Rounds the wardrobe out once the foundation is in.' },
  3: { title: 'In time', hint: 'Occasional pieces and upgrades.' },
}

/** Which budget ceiling on the profile governs each garment type. */
export const BUDGET_CATEGORY: Record<GarmentType, keyof Omit<Budget, 'monthly'>> = {
  tee: 'tops',
  tank: 'tops',
  top: 'tops',
  shirt: 'tops',
  activewear: 'tops',
  knitwear: 'knits',
  sweatshirt: 'knits',
  dress: 'dresses',
  jumpsuit: 'dresses',
  skirt: 'bottoms',
  trousers: 'bottoms',
  jeans: 'bottoms',
  shorts: 'bottoms',
  tailoring: 'outerwear',
  jacket: 'outerwear',
  coat: 'outerwear',
  flats: 'shoes',
  heels: 'shoes',
  sandals: 'shoes',
  boots: 'shoes',
  sneakers: 'shoes',
  bag: 'bags',
  jewellery: 'jewellery',
  belt: 'accessories',
  accessory: 'accessories',
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** "#ABC", "abc", " #aabbcc " -> "#aabbcc"; anything else -> null. */
export function normaliseHex(value: string): string | null {
  const match = HEX.exec(value.trim())
  if (!match?.[1]) return null
  const digits = match[1].toLowerCase()
  return `#${digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits}`
}

/*
 * The wardrobe (migration 0006): the pieces she owns. Warmth is for dressing
 * Wellington's weather; the groups are how the Pieces page shelves them.
 */

export const WARMTHS = ['light', 'mid', 'warm'] as const
export type Warmth = (typeof WARMTHS)[number]

export const WARMTH_LABELS: Record<Warmth, string> = {
  light: 'Light',
  mid: 'Mid',
  warm: 'Warm',
}

/*
 * What a piece is worn for (migration 0014): everyday looks, gym fits, or
 * both. A gym tank stays a tank; this says it is for training.
 */
export const WORN_FOR = ['everyday', 'gym', 'both'] as const
export type WornFor = (typeof WORN_FOR)[number]

export const WORN_FOR_LABELS: Record<WornFor, string> = {
  everyday: 'Everyday',
  gym: 'The gym',
  both: 'Both',
}

/** Whether a piece can go in an everyday look, and in a gym fit. */
export const forEveryday = (piece: { worn_for: WornFor }) => piece.worn_for !== 'gym'
export const forGym = (piece: { worn_for: WornFor }) => piece.worn_for !== 'everyday'

/**
 * The garments a piece can be. Activewear says nothing about what a piece is,
 * so a new piece names its garment and says it is for the gym instead; a
 * piece filed as activewear before keeps it until she says what it is.
 */
export const PIECE_GARMENT_TYPES = GARMENT_TYPES.filter((type) => type !== 'activewear')

export const PIECE_SOURCES = ['slot', 'find', 'link', 'photo', 'typed'] as const
export type PieceSource = (typeof PIECE_SOURCES)[number]

export const GARMENT_GROUPS: { title: string; types: GarmentType[] }[] = [
  { title: 'Tops', types: ['tee', 'tank', 'top', 'shirt'] },
  { title: 'Knitwear', types: ['knitwear', 'sweatshirt'] },
  { title: 'Dresses', types: ['dress', 'jumpsuit'] },
  { title: 'Skirts and trousers', types: ['skirt', 'trousers', 'jeans', 'shorts'] },
  { title: 'Layers and outerwear', types: ['tailoring', 'jacket', 'coat'] },
  { title: 'Shoes', types: ['flats', 'heels', 'sandals', 'boots', 'sneakers'] },
  { title: 'Bags and jewellery', types: ['bag', 'jewellery', 'belt', 'accessory'] },
  { title: 'Activewear', types: ['activewear'] },
]

/** Pieces worn only for the gym have a shelf of their own on the Pieces page, whatever they are. */
export const GYM_SHELF = 'Gym kit'
