/*
 * What an outfit from scratch can be made from (outfit.ts), apart from the
 * database code so the form can run in the browser.
 */

export const OUTFIT_SOURCES = ['closet', 'shops', 'both', 'anywhere'] as const
export type OutfitSource = (typeof OUTFIT_SOURCES)[number]

export const SOURCE_LABELS: Record<OutfitSource, string> = {
  closet: 'My closet',
  shops: 'The shops',
  both: 'Both',
  anywhere: 'Anything',
}

/** What an outfit is, in the words over its name and on its row. */
export function askedFor(outfit: { brief: string; source: OutfitSource }): string {
  const from = {
    closet: 'from your closet',
    shops: 'from the shops',
    both: 'from your closet and the shops',
    anywhere: 'from anything',
  }[outfit.source]
  return `${outfit.brief ? `For “${outfit.brief}”` : 'For an ordinary day'}, ${from}`
}

/** The sources that use her own clothes, and the ones that read the shops. */
export const usesCloset = (source: OutfitSource) => source === 'closet' || source === 'both'
export const usesShops = (source: OutfitSource) => source === 'shops' || source === 'both'

/** The longest brief she can give: "a friend's wedding on Saturday, outdoors, nothing strapless". */
export const BRIEF_MAX = 300
