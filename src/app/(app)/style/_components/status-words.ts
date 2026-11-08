import type { SlotStatus } from '@/lib/wardrobe-values'

/** Her words for where a piece stands. */
export const STATUS_WORDS: Record<SlotStatus, string> = {
  wanted: 'To find',
  candidate: 'One in mind',
  owned: 'Yours',
  retired: 'Retired',
}

export const STATUS_HINTS: Record<SlotStatus, string> = {
  wanted: 'The shops are searched for it every night.',
  candidate: 'You have one in mind. The shops are still searched until you buy it.',
  owned: 'In your closet. The search for it stops.',
  retired: 'Out of the plan. Refill it and Claude proposes what takes its place.',
}
