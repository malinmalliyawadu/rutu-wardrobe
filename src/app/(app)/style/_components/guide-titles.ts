import type { RuleSectionName } from '@/lib/style-guide'

export const SECTION_TITLES: Record<RuleSectionName, string> = {
  silhouette: 'Shape and proportion',
  shoes: 'Shoes',
  accessories: 'Jewellery and accessories',
}

/** What each part of the guide covers, said once on its edit page. */
export const SECTION_INTROS: Record<RuleSectionName, string> = {
  silhouette: 'Where your waist is marked, necklines, hem lengths, trouser rise and leg, where the weight goes, pattern scale and how cloth should fall, for your height and build.',
  shoes: "Toes, straps and heels that carry the hem rules down to the ground, and walk Wellington's hills.",
  accessories: 'Jewellery scale and metal, earrings for your neck, bags for your height, belts, frames, and what holds up in the wind.',
}

/** The metals as two flat studs: never a gradient. */
export const METAL_HEX = { gold: '#b08d3c', silver: '#b4b7bc' } as const
