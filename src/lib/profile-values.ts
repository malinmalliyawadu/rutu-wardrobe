/**
 * The closed vocabularies of the profile, shared by the schema, Claude's
 * output format and the confirm form. The database check constraints in
 * db/migrations/0001_core_schema.sql list the same values.
 */

export const UNDERTONES = ['warm', 'cool', 'neutral', 'olive'] as const
export const SKIN_DEPTHS = ['fair', 'light', 'medium', 'tan', 'deep'] as const
export const CONTRAST_LEVELS = ['low', 'medium', 'high'] as const
export const BUILDS = ['slim', 'athletic', 'curvy', 'full'] as const
export const WAIST_DEFINITIONS = ['defined', 'moderate', 'straight'] as const
export const SHOULDER_HIP = ['shoulders_wider', 'balanced', 'hips_wider'] as const
export const TORSO_LEG = ['long_torso', 'balanced', 'long_legs'] as const
export const NECK_LENGTHS = ['short', 'average', 'long'] as const
export const SEASONS = [
  'bright spring',
  'true spring',
  'light spring',
  'light summer',
  'true summer',
  'soft summer',
  'soft autumn',
  'true autumn',
  'deep autumn',
  'deep winter',
  'true winter',
  'bright winter',
] as const
export const FITS = ['slim', 'regular', 'relaxed', 'oversized'] as const

/** The days of the week, Monday first, as Life stores the days she trains. */
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

/** The weekday of a YYYY-MM-DD date. */
export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]!
}
/** Letter sizes, smallest first. */
export const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
/** AU and NZ women's dress sizes, which UK sizing shares. */
export const DRESS_SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const

export type Undertone = (typeof UNDERTONES)[number]
export type SkinDepth = (typeof SKIN_DEPTHS)[number]
export type ContrastLevel = (typeof CONTRAST_LEVELS)[number]
export type Build = (typeof BUILDS)[number]
export type WaistDefinition = (typeof WAIST_DEFINITIONS)[number]
export type ShoulderHip = (typeof SHOULDER_HIP)[number]
export type TorsoLeg = (typeof TORSO_LEG)[number]
export type NeckLength = (typeof NECK_LENGTHS)[number]
export type Season = (typeof SEASONS)[number]
export type Fit = (typeof FITS)[number]
export type LetterSize = (typeof LETTER_SIZES)[number]
export type DressSize = (typeof DRESS_SIZES)[number]

/** Human labels for the snake_case values. */
export const LABELS: Record<string, string> = {
  warm: 'Warm',
  cool: 'Cool',
  neutral: 'Neutral',
  olive: 'Olive',
  fair: 'Fair',
  light: 'Light',
  medium: 'Medium',
  tan: 'Tan',
  deep: 'Deep',
  low: 'Low',
  high: 'High',
  slim: 'Slim',
  athletic: 'Athletic',
  curvy: 'Curvy',
  full: 'Full',
  defined: 'Defined waist',
  moderate: 'Some waist definition',
  straight: 'Straight through the waist',
  shoulders_wider: 'Shoulders wider than hips',
  balanced: 'Balanced',
  hips_wider: 'Hips wider than shoulders',
  long_torso: 'Longer torso',
  long_legs: 'Longer legs',
  short: 'Short',
  average: 'Average',
  long: 'Long',
  regular: 'Regular',
  relaxed: 'Relaxed',
  oversized: 'Oversized',
}

export function label(value: string): string {
  return LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}
