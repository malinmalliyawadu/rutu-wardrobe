import { dollars, type Slot } from '@/lib/blueprint'
import { band } from '@/lib/format'
import type { Profile } from '@/lib/profile'
import { colourNameFor, type StoredGuide } from '@/lib/style-guide'
import type { SlotStatus } from '@/lib/wardrobe-values'

/*
 * What the plan's pages and forms need from a slot, worked out on the server.
 * The library calls a plan item a slot; on screen it is a piece of the plan.
 */

export type SlotRow = {
  id: number
  name: string
  why: string
  colours: { hex: string; name: string | null }[]
  band: string | null
  status: SlotStatus
}

export function toRow(slot: Slot, guide: StoredGuide | null): SlotRow {
  return {
    id: slot.id,
    name: slot.name,
    why: slot.why,
    colours: slot.colours.map((hex) => ({ hex, name: colourNameFor(guide, hex) })),
    band: band(slot.budget_min_cents, slot.budget_max_cents),
    status: slot.status,
  }
}

export type SlotFormValues = {
  name: string
  why: string
  priority: number
  garment_type: string
  colour_family: string
  colours: string[]
  fabrics: string
  fit: string
  size_labels: string
  size_note: string
  budget_min: number | null
  budget_max: number | null
}

/** What the slot form starts from: a saved slot, or a blank one. */
export function formValues(slot: Slot | null): SlotFormValues {
  return {
    name: slot?.name ?? '',
    why: slot?.why ?? '',
    priority: slot?.priority ?? 2,
    garment_type: slot?.garment_type ?? '',
    colour_family: slot?.colour_family ?? '',
    colours: slot?.colours ?? [],
    fabrics: slot?.fabrics.join(', ') ?? '',
    fit: slot?.fit ?? '',
    size_labels: slot?.sizes.labels?.join(', ') ?? '',
    size_note: slot?.sizes.note ?? '',
    budget_min: dollars(slot?.budget_min_cents ?? null),
    budget_max: dollars(slot?.budget_max_cents ?? null),
  }
}

export type PaletteSwatch = { hex: string; name: string }

export function paletteSwatches(guide: StoredGuide | null): { best: PaletteSwatch[]; neutrals: PaletteSwatch[] } {
  return {
    best: guide?.palette.best.map(({ hex, name }) => ({ hex, name })) ?? [],
    neutrals: guide?.palette.neutrals.map(({ hex, name }) => ({ hex, name })) ?? [],
  }
}

export function ceilings(profile: Profile): Record<string, number | null | undefined> {
  return { ...profile.budget }
}

/** "about $1,850 to $3,200" for what is still to find. */
export function toFindBand(slots: Pick<Slot, 'status' | 'budget_min_cents' | 'budget_max_cents'>[]): string | null {
  const toFind = slots.filter((slot) => slot.status === 'wanted' || slot.status === 'candidate')
  const min = toFind.reduce((sum, slot) => sum + (slot.budget_min_cents ?? 0), 0)
  const max = toFind.reduce((sum, slot) => sum + (slot.budget_max_cents ?? 0), 0)
  if (max === 0) return null
  return band(min, max)
}
