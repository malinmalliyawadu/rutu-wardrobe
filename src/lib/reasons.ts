/*
 * Why she passed on a find or a look: the closed lists the database checks
 * and the chips say. No imports, so a client component can read the labels
 * without pulling in the database.
 */

export const DISMISS_REASONS = ['colour', 'fit', 'price', 'not_for_me'] as const
export type DismissReason = (typeof DISMISS_REASONS)[number]

export const REASON_LABELS: Record<DismissReason, string> = {
  colour: 'The colour',
  fit: 'The fit',
  price: 'The price',
  not_for_me: 'Not my thing',
}

export const LOOK_DISMISS_REASONS = ['colours', 'too_dressy', 'too_casual', 'weather', 'not_me'] as const
export type LookDismissReason = (typeof LOOK_DISMISS_REASONS)[number]

export const LOOK_REASON_LABELS: Record<LookDismissReason, string> = {
  colours: 'Colours',
  too_dressy: 'Too dressy',
  too_casual: 'Too casual',
  weather: 'Wrong for the weather',
  not_me: 'Not me',
}

/** A record of labels as the list of chips a form shows, in the list's order. */
export function reasonChips<T extends string>(values: readonly T[], labels: Record<T, string>): { value: T; label: string }[] {
  return values.map((value) => ({ value, label: labels[value] }))
}
