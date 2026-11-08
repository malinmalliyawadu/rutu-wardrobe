import { ONE_PIECES, OUTER, TOPS } from './look-rules.ts'
import type { GarmentType, Warmth } from './wardrobe-values.ts'

/*
 * How warm an outfit may be for a day, and how warm a piece is. Opus left to
 * itself overdresses: three layers with a wool knit on a summer day, because
 * Wellington reads as cold and windy and a season reads as a fabric weight.
 * So the day's warmth is a limit read from the forecast, stated in the prompt
 * and held by code (tidyDay drops an option over it).
 *
 * The limit goes by the warmest the day feels between 7am and 10pm. The
 * feels-like figure already counts the wind, so nothing here adds warmth for
 * it again. Cool mornings and evenings are answered by one light layer she
 * can carry, which every limit leaves room for.
 *
 * Legs are the other half. On a cold day bare legs are the mistake, so
 * shorts and sandals are ruled out, and a skirt or dress goes with tights
 * and closed shoes or boots. Tights are not pieces, so the prompts ask for
 * them in the styling rather than code holding them.
 *
 * A piece's warmth is what she or the photo read said; when neither did (a
 * piece from the blueprint, a find or typed in), it is read from the garment
 * and the cloth its name and fabric give. Pure, so it runs anywhere.
 */

/** The tops, dresses, tailoring and outer layers on her at once: a tee under a shirt is two, a knit over a dress two. */
export const LAYERS: GarmentType[] = [...TOPS, ...ONE_PIECES, ...OUTER, 'tailoring']

export type WarmthBand = 'hot' | 'warm' | 'mild' | 'cold'

export type WarmthLimit = {
  band: WarmthBand
  /** The warmest the day feels, in degrees, that the limit was read from. */
  feels_high: number
  /** Most layers at once; null when the day takes what it needs. */
  most_layers: number | null
  /** Most pieces of warmth "warm"; null when there is no limit. */
  most_warm_pieces: number | null
  /** Garments wrong for the day whatever they are made of: too warm, or too bare. */
  ruled_out: GarmentType[]
  /** Whether bare legs suit the day; when not, a skirt or dress is worn with tights and closed shoes. */
  bare_legs: boolean
}

/** From the warmest band down; a day is in the first whose `from` it reaches. */
const BANDS: (Omit<WarmthLimit, 'feels_high'> & { from: number })[] = [
  { band: 'hot', from: 22, most_layers: 2, most_warm_pieces: 0, ruled_out: ['knitwear', 'sweatshirt', 'coat'], bare_legs: true },
  { band: 'warm', from: 18, most_layers: 2, most_warm_pieces: 0, ruled_out: ['coat'], bare_legs: true },
  { band: 'mild', from: 14, most_layers: 3, most_warm_pieces: 1, ruled_out: [], bare_legs: true },
  { band: 'cold', from: -Infinity, most_layers: null, most_warm_pieces: null, ruled_out: ['shorts', 'sandals'], bare_legs: false },
]

/** The limit for a day that feels at most this warm. */
export function warmthLimit(feelsHigh: number): WarmthLimit {
  const { band, most_layers, most_warm_pieces, ruled_out, bare_legs } = BANDS.find((band) => feelsHigh >= band.from)!
  return { band, feels_high: feelsHigh, most_layers, most_warm_pieces, ruled_out, bare_legs }
}

/** The limit as the prompts give it, with what it was read from: a forecast, or the month's usual high. */
export function limitForPrompt(limit: WarmthLimit, readFrom = `feels like ${limit.feels_high}° at the warmest`) {
  return {
    read_from: readFrom,
    most_layers: limit.most_layers,
    most_warm_pieces: limit.most_warm_pieces,
    garments_ruled_out: limit.ruled_out,
    bare_legs: limit.bare_legs,
  }
}

function count(n: number): string {
  return ['no', 'one', 'two', 'three', 'four'][n] ?? String(n)
}

/** Garment names in the plural, as a sentence lists them. */
function plural(type: GarmentType): string {
  return ['knitwear', 'shorts', 'sandals', 'jeans', 'trousers', 'activewear', 'jewellery', 'flats', 'heels', 'boots', 'sneakers'].includes(type)
    ? type
    : `${type}s`
}

function list(parts: string[], last: 'and' | 'or'): string {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ${last} ${parts.at(-1)}` : (parts[0] ?? '')
}

function bandInWords(band: (typeof BANDS)[number], next: number | null): string {
  const range = Number.isFinite(band.from)
    ? next === null
      ? `from ${band.from}°`
      : `${band.from}° to ${next - 1}°`
    : `under ${BANDS.at(-2)!.from}°`
  const parts: string[] = []
  if (band.most_layers === null) parts.push('what the day needs')
  else {
    parts.push(`at most ${count(band.most_layers)} layers`)
    parts.push(band.most_warm_pieces === 0 ? 'nothing warm' : `at most ${count(band.most_warm_pieces!)} warm piece${band.most_warm_pieces === 1 ? '' : 's'}`)
  }
  if (band.ruled_out.length > 0) parts.push(`no ${list(band.ruled_out.map(plural), 'or')}`)
  if (!band.bare_legs) parts.push('no bare legs')
  return `${range}, ${list(parts, 'and')}`
}

/** The bands in a sentence, from the same numbers code holds the outfits to. */
export const WARMTH_RULES = `Each piece says how warm it is: light, mid or warm. Layers are the tops, dresses, tailoring and outer layers on her at once: a tee under a shirt is two, a knit over a dress two, a jacket over them three. How many a day takes goes by the warmest it feels: ${BANDS.map((band, index) =>
  bandInWords(band, index === 0 ? null : BANDS[index - 1]!.from),
).join('; ')}. When bare legs do not suit the day, a skirt or dress is worn with opaque tights and closed shoes or boots, and the styling says so. Overdressing is the commoner mistake: when in doubt, one layer fewer and lighter cloth. The feels-like figure already counts the wind, so never add a layer for the wind on top of it.`

// ---------------------------------------------------------------------------
// A piece's warmth
// ---------------------------------------------------------------------------

// "button-down" is a collar, not a filling.
const WARM_CLOTH =
  /\b(wool|woollen|woolen|merino|cashmere|lambswool|alpaca|mohair|shetland|fleece|flannel|tweed|cord|cords|corduroy|moleskin|(?<!button-)down|puffer|padded|quilted|sherpa|shearling|teddy|faux fur|boucl[eé]|melton|loden|chunky|cable)\b/i
// Not wool: worsted trousers and a wool skirt are worn year round.
const WARM_BOTTOMS = /\b(flannel|tweed|cord|cords|corduroy|moleskin|fleece|brushed|boucl[eé]|sherpa|quilted)\b/i
const LIGHT_CLOTH =
  /\b(linen|seersucker|poplin|voile|chambray|cheesecloth|broderie|eyelet|silk|satin|chiffon|georgette|crepe de chine|slip|mesh|ripstop|nylon|shell|rain|raincoat|windbreaker|trench|mac)\b/i
/** A dress or jumpsuit with some body to it: not a light summer one, not a warm wool one. */
const MID_DRESS = /\b(denim|leather|suede|velvet|ponte|knit|knitted|jersey|long[- ]sleeved?)\b/i

type Warmable = { garment_type: GarmentType; warmth: Warmth | null; fabric: string | null; name: string }

/** How warm a piece is; null for shoes and what is worn or carried, which no limit counts. */
export function pieceWarmth(piece: Warmable): Warmth | null {
  const type = piece.garment_type
  if (['flats', 'heels', 'sandals', 'boots', 'sneakers', 'belt', 'bag', 'jewellery', 'accessory'].includes(type)) return null
  if (piece.warmth) return piece.warmth
  const words = `${piece.name} ${piece.fabric ?? ''}`
  const warm = WARM_CLOTH.test(words)
  const light = LIGHT_CLOTH.test(words)
  switch (type) {
    case 'tee':
    case 'tank':
    case 'shorts':
    case 'activewear':
      return 'light'
    case 'top':
    case 'shirt':
      return warm ? 'mid' : 'light'
    case 'knitwear':
    case 'sweatshirt':
      return warm ? 'warm' : 'mid'
    case 'dress':
    case 'jumpsuit':
      return warm ? 'warm' : MID_DRESS.test(words) && !light ? 'mid' : 'light'
    case 'coat':
      return light && !warm ? 'mid' : 'warm'
    case 'skirt':
    case 'trousers':
    case 'jeans':
      return WARM_BOTTOMS.test(words) ? 'warm' : light ? 'light' : 'mid'
    default:
      // jacket, tailoring
      return warm ? 'warm' : light ? 'light' : 'mid'
  }
}

/** Whether an outfit's pieces sit within the day's limit. */
export function withinWarmth(pieces: Warmable[], limit: WarmthLimit | null): boolean {
  if (!limit) return true
  const layers = pieces.filter((piece) => LAYERS.includes(piece.garment_type)).length
  const warm = pieces.filter((piece) => pieceWarmth(piece) === 'warm').length
  return (
    (limit.most_layers === null || layers <= limit.most_layers) &&
    (limit.most_warm_pieces === null || warm <= limit.most_warm_pieces) &&
    !pieces.some((piece) => limit.ruled_out.includes(piece.garment_type))
  )
}
