import type { Sizes } from '../profile.ts'
import type { GarmentType } from '../wardrobe-values.ts'

/*
 * Rules, not Claude: which products are womenswear, what garment each one is,
 * and what its size labels mean. They run at every ingest over every product,
 * so a rule change applies to the whole catalogue the next night. The cases
 * they settle are in tests/finder-rules.test.ts.
 */

export type Classification = {
  womenswear: boolean
  garment_type: GarmentType | null
  garment_kind: string | null
}

export type ClassifyInput = {
  title: string
  productType: string | null
  tags: string[]
  vendor: string | null
  catalogue: 'womenswear' | 'mixed'
}

// ---------------------------------------------------------------------------
// Garment type
// ---------------------------------------------------------------------------

type Rule = { pattern: RegExp; garment: GarmentType | null; kind?: string }

/**
 * Never a slot: judged on the product type and title together. Underwear,
 * swimwear, sleepwear, hosiery and homewares are out; jewellery, dresses and
 * skirts are very much in.
 */
const NOT_CLOTHING =
  /\b(towels?|candles?|mugs?|posters?|stickers?|fragrances?|perfumes?|colognes?|eau de|parfum|skin ?care|make ?up|lipsticks?|soaps?|shampoo|conditioner|deodorant|gift ?cards?|vouchers?|cushions?|blankets?|vases?|toys?|dolls?|playing cards|keyrings?|key rings?|lanyards?|lighters?|umbrellas?|socks?|underwear|knickers|briefs|thongs?|g-strings?|bras?|bralettes?|lingerie|shapewear|swim\w*|bikinis?|one-pieces?|pyjamas?|pajamas?|robes?|loungewear|sleepwear|nightdress(es)?|nighties?|wallets?|card ?holders?|purses?|sunglasses|eyewear|glasses|tights|stockings|hosiery|laces|shoe care|insoles|wetsuits?|rash ?guards?|gaiters?|dressing gowns?)\b/i

/** Words that only exclude when they are the product type, because they turn up in titles ("Book Club Shirt"). */
const NOT_CLOTHING_TYPE = /\b(books?|cards?|home|homewares?|art|prints?|magazines?|beauty|gift)\b/i

/**
 * Sport-specific kit: a running shoe, a tennis skirt, gym leggings. It is
 * activewear whatever garment it also is, so it never fills a style slot (the
 * blueprint asks for activewear by name when it wants it).
 */
const SPORT =
  /\b(running|run|trail|hiking|hike|basketball|football|soccer|golf|tennis|training|gym|cycling|cycle|activewear|performance|compression|base ?layer|workout|yoga|pilates|leggings?|sports? crop|marathon|stability|ski|skiing|snowboard(ing)?|capilene)\b/i

/** A sports bra is a top to train in; every other bra is underwear. */
const SPORTS_BRA = /\bsports? bras?\b/i

/** Most specific first. The first rule that matches wins. */
const RULES: Rule[] = [
  // Not a boot-cut or boot-leg jean.
  { pattern: /\b(boots?|booties|chelseas?)\b(?![\s-]*(cut|leg))/i, garment: 'boots' },
  { pattern: /\b(sneakers?|trainers?|runners?)\b/i, garment: 'sneakers' },
  // A heel is a heel whatever else it is: a heeled sandal, a heeled mule.
  { pattern: /\b(heels?|heeled|pumps?|stilettos?|kitten|wedges?|platforms?)\b/i, garment: 'heels' },
  { pattern: /\b(sandals?|slides?|espadrilles?|jandals?|flip ?flops?)\b/i, garment: 'sandals' },
  {
    // Not a flat-front trouser or a flat knit.
    pattern: /\b(flats?|ballet|ballerinas?|loafers?|mules?|slingbacks?|mary ?janes?|brogues?|moccasins?|clogs?|shoes?|footwear)\b(?![\s-]*(front|knit|brim))/i,
    garment: 'flats',
  },
  {
    pattern: /\b(bags?|handbags?|clutch(es)?|totes?|backpacks?|cross ?body|shoulder ?bags?|baguettes?|hobos?|satchels?|bucket bags?|pouch(es)?|duffle|duffel)\b/i,
    garment: 'bag',
  },
  // A dress "with belt" is a dress.
  { pattern: /(?<!\b(with|and|plus|&)\s)\bbelts?\b/i, garment: 'belt' },
  // Not "drop": a drop waist or a drop shoulder is no earring.
  { pattern: /\b(earrings?|hoops?|huggies|studs?|ear ?cuffs?)\b/i, garment: 'jewellery', kind: 'earrings' },
  { pattern: /\b(necklaces?|pendants?|chokers?|lockets?)\b(?![\s-]*neck)/i, garment: 'jewellery', kind: 'necklace' },
  { pattern: /\b(bracelets?|bangles?|anklets?)\b/i, garment: 'jewellery', kind: 'bracelet' },
  // Not ring-spun cotton, an O-ring or a ring detail.
  { pattern: /(?<!\bo[\s-]?)\b(rings?|signet)\b(?![\s-]*(spun|detail|front|trim|hardware))/i, garment: 'jewellery', kind: 'ring' },
  { pattern: /\bjewell?ery\b/i, garment: 'jewellery' },
  { pattern: /\b(scarf|scarves|snood|bandanas?)\b/i, garment: 'accessory', kind: 'scarf' },
  { pattern: /\b(claw ?clips?|hair ?clips?|scrunchies?|headbands?|hair ?ties?|barrettes?|hair ?bows?)\b/i, garment: 'accessory', kind: 'hair' },
  // Not a cap sleeve.
  { pattern: /\b(beanies?|caps?|hats?|berets?|bucket)\b(?![\s-]*sleeved?)/i, garment: 'accessory', kind: 'hat' },
  { pattern: /\b(gloves?|mittens?)\b/i, garment: 'accessory', kind: 'gloves' },
  { pattern: /\bwatch(es)?\b/i, garment: 'accessory', kind: 'watch' },
  // One-pieces before tops and bottoms, so a shirt dress is a dress and a
  // denim skirt a skirt. "Dress pants" are trousers.
  { pattern: /\b(jumpsuits?|playsuits?|rompers?|overalls|boiler ?suits?)\b/i, garment: 'jumpsuit' },
  { pattern: /\b(dress(es)?|gowns?|kaftans?|caftans?)\b(?![\s-]*(pants?|trousers?|shirts?|shorts?|coats?))/i, garment: 'dress' },
  { pattern: /\b(skirts?|skorts?|sarongs?)\b/i, garment: 'skirt' },
  { pattern: /\b(jeans?|selvage|selvedge)\b/i, garment: 'jeans' },
  // "Linen Short" is shorts; a short sleeve, a short trench or a short puffer is not.
  {
    pattern: /\bshorts\b|\bshort\b(?!(?:[\s-]+\w+){0,2}?[\s-]+(sleeved?|coats?|jackets?|trench|puffers?|cardigans?|parkas?|length|kimonos?)\b)/i,
    garment: 'shorts',
  },
  {
    pattern: /\b(trousers?|pants?|chinos?|slacks|culottes|flares|joggers?|track ?pants?|sweatpants?|palazzos?|leggings?)\b/i,
    garment: 'trousers',
  },
  { pattern: /\b(blazers?|suits?|waistcoats?|tailored vests?)\b/i, garment: 'tailoring' },
  { pattern: /\b(tanks?|singlets?|camis?|camisoles?|vest tops?)\b/i, garment: 'tank' },
  { pattern: /\b(t-?shirts?|tees?|henleys?)\b/i, garment: 'tee' },
  // Insulation named like a knit (a Down Sweater, a Puffer Vest) is a jacket.
  { pattern: /\b(down|puff(er)?|insulated|quilted|padded)\b.*\b(sweaters?|hoody|hoodies?|pullovers?|jumpers?|vests?)\b/i, garment: 'jacket' },
  {
    pattern: /\b(sweat ?shirts?|sweats?|sweat tops?|hoodies?|hoody|hooded sweat|crew sweat|fleece)\b/i,
    garment: 'sweatshirt',
  },
  {
    pattern: /\b(knits?|knitted|knitwear|sweaters?|jumpers?|cardigans?|cardis?|pullovers?|roll ?necks?|turtlenecks?|mock necks?|half ?zips?|vests?)\b/i,
    garment: 'knitwear',
  },
  { pattern: /\b(shirts?|shackets?)\b/i, garment: 'shirt' },
  // A crop puffer or a crop trench is outerwear, below.
  {
    pattern: /\b(tops?|blouses?|bodysuits?|bustiers?|corsets?|tunics?|crops?|bandeaus?|halters?)\b(?![\s-]*(jackets?|coats?|trench|puffers?|bombers?|blazers?))/i,
    garment: 'top',
  },
  {
    pattern: /\b(coats?|parkas?|trench|overcoats?|peacoats?|pea coats?|macs?)\b/i,
    garment: 'coat',
  },
  {
    pattern: /\b(jackets?|bombers?|shells?|anoraks?|windbreakers?|blousons?|gilets?|puffers?|rain ?jackets?|capes?|ponchos?)\b/i,
    garment: 'jacket',
  },
  // Denim that is not a jacket, a skirt or a dress by now is a pair of jeans.
  { pattern: /\bdenim\b/i, garment: 'jeans' },
]

/** "Merino Crew" says knitwear only once the product type says so; these types settle it on their own. */
const TYPE_ONLY: Rule[] = [
  { pattern: /\b(knitwear|knits?)\b/i, garment: 'knitwear' },
  { pattern: /\b(outerwear)\b/i, garment: 'jacket' },
  { pattern: /\b(dresses)\b/i, garment: 'dress' },
  { pattern: /\b(skirts)\b/i, garment: 'skirt' },
  { pattern: /\b(pants|bottoms)\b/i, garment: 'trousers' },
  { pattern: /\b(tops?|shirts? ?& ?tops?)\b/i, garment: 'top' },
  { pattern: /\b(footwear)\b/i, garment: 'flats' },
]

/** Tags some stores use for their category ("cat_low:Sneakers", "Type:Sneakers"); END. leaves product_type empty and relies on them. */
const CATEGORY_TAG = /^(cat_low|cat_med|type|category|product_type):\s*(.+)$/i

export function categoryText(productType: string | null, tags: string[]): string {
  const fromTags = tags.flatMap((tag) => {
    const match = CATEGORY_TAG.exec(tag)
    return match ? [match[2]!] : []
  })
  return [productType ?? '', ...fromTags].filter(Boolean).join(' / ')
}

export function garmentOf(
  title: string,
  productType: string | null,
  options: { sport?: boolean } = {},
): { garment_type: GarmentType | null; garment_kind: string | null } {
  const type = productType ?? ''
  const text = `${title} | ${type}`
  if (SPORTS_BRA.test(text)) return { garment_type: options.sport === false ? 'tank' : 'activewear', garment_kind: null }
  if (NOT_CLOTHING.test(text) || NOT_CLOTHING_TYPE.test(type)) return { garment_type: null, garment_kind: null }
  if (options.sport !== false && SPORT.test(text)) return { garment_type: 'activewear', garment_kind: null }
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return { garment_type: rule.garment, garment_kind: rule.kind ?? null }
  }
  for (const rule of TYPE_ONLY) {
    if (rule.pattern.test(type)) return { garment_type: rule.garment, garment_kind: rule.kind ?? null }
  }
  return { garment_type: null, garment_kind: null }
}

/**
 * What a piece of sport kit is as a garment, for a piece she owns: a training
 * tank is a tank, running shorts are shorts. Pieces say they are for the gym
 * on their own (worn_for), so the finder's activewear catch-all is left out.
 */
export function kitGarmentOf(title: string, productType: string | null): GarmentType | null {
  return garmentOf(title, productType, { sport: false }).garment_type
}

/** The accessory or jewellery kind a slot asks for, from its name ("Gold huggie hoops" -> "earrings"). */
export function slotKind(garment: GarmentType, name: string): string | null {
  if (garment !== 'accessory' && garment !== 'jewellery') return null
  for (const rule of RULES) {
    if (rule.garment === garment && rule.kind && rule.pattern.test(name)) return rule.kind
  }
  return null
}

// ---------------------------------------------------------------------------
// Womenswear
// ---------------------------------------------------------------------------

const WOMEN = /\b(women'?s?|womens|womenswear|woman|ladies|female|wmns|gender:womens|unisex)\b/i
const MEN = /\b(men'?s?|mens|menswear|male|gender:mens)\b/i
const KIDS = /\b(kids?|child|children|childrens|boys?|girls?|baby|babies|junior|youth|toddlers?|infants?|teens?)\b/i
/** A tag that sets the gender on purpose ("Gender:Women"), as against a loose "Womens" tag. */
const GENDER_WOMEN_TAG = /^gender:\s*(women|womens|female|unisex)$/i

/**
 * Womenswear from the words a store uses. A womenswear-only store needs only
 * to not say men or kids; a mixed store has to say women (or unisex)
 * somewhere in the type, tags or title, and is not womenswear if it says men
 * and not women. A product type that says men and not women is the store's
 * own filing and outweighs a loose women tag, though not a gender tag.
 */
export function isWomenswear(input: Pick<ClassifyInput, 'title' | 'productType' | 'tags' | 'catalogue'>): boolean {
  const words = [input.productType ?? '', input.title, ...input.tags].join(' | ')
  if (KIDS.test(words)) return false
  const type = input.productType ?? ''
  if (MEN.test(type) && !WOMEN.test(type) && !input.tags.some((tag) => GENDER_WOMEN_TAG.test(tag))) return false
  const women = WOMEN.test(words)
  const men = MEN.test(words)
  if (input.catalogue === 'womenswear') return women || !men
  return women
}

export function classify(input: ClassifyInput): Classification {
  return { womenswear: isWomenswear(input), ...garmentOf(input.title, categoryText(input.productType, input.tags)) }
}

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

/**
 * How a garment is sized. Tops, knits, dresses and coats by letter or AU
 * number; skirts and trousers the same, or by the waist in inches (jeans
 * mostly); shoes by EU, AU (which is the US women's number) or UK; the rest
 * by nothing that matters.
 */
export type SizeGroup = 'tops' | 'bottoms' | 'feet' | 'other'

export function sizeGroup(garment: GarmentType | null): SizeGroup {
  switch (garment) {
    case 'skirt':
    case 'trousers':
    case 'jeans':
    case 'shorts':
      return 'bottoms'
    case 'flats':
    case 'heels':
    case 'sandals':
    case 'boots':
    case 'sneakers':
      return 'feet'
    case 'belt':
    case 'bag':
    case 'jewellery':
    case 'accessory':
    case null:
      return 'other'
    default:
      return 'tops'
  }
}

const LETTERS: Record<string, string> = {
  xxs: 'XXS', '2xs': 'XXS', 'xx-small': 'XXS', xxsmall: 'XXS',
  xs: 'XS', 'x-small': 'XS', xsmall: 'XS', 'extra small': 'XS', 'extra-small': 'XS',
  s: 'S', sm: 'S', small: 'S',
  m: 'M', med: 'M', medium: 'M',
  l: 'L', lg: 'L', large: 'L',
  xl: 'XL', 'x-large': 'XL', xlarge: 'XL', 'extra large': 'XL', 'extra-large': 'XL',
  xxl: 'XXL', '2xl': 'XXL', 'xx-large': 'XXL', xxlarge: 'XXL', 'xx large': 'XXL',
  xxxl: 'XXXL', '3xl': 'XXXL', 'xxx-large': 'XXXL', 'xxx large': 'XXXL',
}
const LETTER_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const ONE = /^(one ?size|os|o\/s|osf|osa|one size fits all|osfa|no size|default title|n\/a|1 ?size|all|all sizes?)$/i

const even = (n: number) => Number.isInteger(n) && n % 2 === 0

/**
 * A size label as a key the filter can compare: "S", "S/M", "AU10" (AU, NZ
 * and UK women's clothing, with US, EU and IT numbers turned into it), "W27"
 * (a waist in inches), "EU38", "US7" (AU and US women's shoes), "UK5",
 * "ONE". Null when the label is not understood: a label's own 0 to 3, which
 * means something different at every label, is never guessed at.
 */
export function sizeKey(label: string, garment: GarmentType | null): string | null {
  const value = label.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!value) return null
  if (ONE.test(value)) return 'ONE'
  const group = sizeGroup(garment)

  const letter = LETTERS[value]
  if (letter) return letter
  // A number with its letter alongside, either way round: "8 (S)", "S (8)", "XS / 6".
  const withLetter = /^(\d{1,2}) ?[(/] ?([a-z -]+?)\)?$/.exec(value) ?? /^([a-z -]+?) ?[(/] ?(\d{1,2})\)?$/.exec(value)
  if (withLetter) {
    const word = /^\d/.test(withLetter[1]!) ? withLetter[2]! : withLetter[1]!
    if (LETTERS[word.trim()]) return LETTERS[word.trim()]!
  }
  const pair = /^([a-z0-9-]+) ?[/-] ?([a-z0-9-]+)$/.exec(value)
  if (pair && LETTERS[pair[1]!] && LETTERS[pair[2]!]) return `${LETTERS[pair[1]!]}/${LETTERS[pair[2]!]}`

  // Inches: '27"', "27 inch waist". Always a waist here.
  const inches = /^(\d{2})\s*(?:"|''|inch(?:es)?|in)(?:\s*waist)?(?:\s*x\s*\d{2}\s*(?:"|''|inch(?:es)?|in)?\s*leg)?$/.exec(value)
  if (inches) return `W${inches[1]}`

  const prefixed =
    /^(eu|uk|us|au|nz|it|fr|w)\.? ?(\d{1,2}(?:\.5)?)$/.exec(value) ?? /^(\d{1,2}(?:\.5)?) ?(eu|uk|us|au|nz|it|w)$/.exec(value)
  if (prefixed) {
    const [system, text] = /^\d/.test(prefixed[1]!) ? [prefixed[2]!, prefixed[1]!] : [prefixed[1]!, prefixed[2]!]
    const number = Number(text)
    if (system === 'w') return `W${text}`
    if (group === 'feet') {
      if (system === 'eu' || system === 'it' || system === 'fr') return `EU${text}`
      if (system === 'uk') return `UK${text}`
      return `US${text}`
    }
    if (!even(number)) return null
    switch (system) {
      case 'au':
      case 'nz':
      case 'uk':
        return `AU${number}`
      case 'us':
        return `AU${number + 4}`
      case 'eu':
      case 'fr':
        return number >= 30 ? `AU${number - 28}` : null
      case 'it':
        return number >= 34 ? `AU${number - 32}` : null
    }
  }

  // Waist by leg: "27/30", "27 x 30", "W27 L30".
  const waistLeg = /^w?(\d{2})w? ?(?:[x/]|l) ?l?(\d{2})l?$/.exec(value)
  if (waistLeg) return `W${waistLeg[1]}`

  const bare = /^(\d{1,2}(?:\.5)?)$/.exec(value)
  if (bare && garment) {
    const number = Number(bare[1])
    switch (group) {
      case 'bottoms':
        if (garment === 'jeans' && number >= 22 && number <= 40) return `W${number}`
        if (even(number) && number >= 4 && number <= 22) return `AU${number}`
        if (number >= 23 && number <= 40 && Number.isInteger(number)) return `W${number}`
        return null
      case 'tops':
        if (even(number) && number >= 4 && number <= 24) return `AU${number}`
        if (even(number) && number >= 32 && number <= 50) return `AU${number - 28}`
        return null
      case 'feet':
        if (number >= 34 && number <= 46) return `EU${bare[1]}`
        if (number >= 4 && number <= 13) return `US${bare[1]}`
        return null
      default:
        return null
    }
  }
  return null
}

/** The AU numbers a letter usually means. Labels disagree by a size either way, so each letter takes two. */
const LETTER_TO_AU: Record<string, number[]> = {
  XXS: [4, 6],
  XS: [6, 8],
  S: [8, 10],
  M: [10, 12],
  L: [12, 14],
  XL: [14, 16],
  XXL: [16, 18],
  XXXL: [18, 20],
}

/**
 * The jeans waists, in inches, an AU size usually means, for when she gave a
 * size but no waist: denim is labelled by the waist, and labels disagree by
 * an inch either way, so each size takes two.
 */
const AU_TO_WAIST: Record<number, number[]> = {
  4: [23, 24],
  6: [24, 25],
  8: [25, 26],
  10: [27, 28],
  12: [29, 30],
  14: [31, 32],
  16: [33, 34],
  18: [35, 36],
  20: [37, 38],
}

/** The letters an AU number usually falls under. */
function lettersForAu(au: number): string[] {
  return LETTER_ORDER.filter((letter) => LETTER_TO_AU[letter]?.includes(au))
}

/** A letter and every pair containing it: "S" is also "XS/S" and "S/M". */
function withPairs(letter: string): string[] {
  const index = LETTER_ORDER.indexOf(letter)
  if (index < 0) return []
  const pairs = [LETTER_ORDER[index - 1], LETTER_ORDER[index + 1]]
    .filter((other): other is string => Boolean(other))
    .flatMap((other) => [`${letter}/${other}`, `${other}/${letter}`])
  return [letter, ...pairs]
}

/**
 * Her clothing keys. With both a letter and an AU size, each stands for
 * itself; with one, the other is read from it, so a store that sizes in
 * numbers still finds her when she gave only a letter.
 */
function clothingKeys(sizes: Partial<Sizes>): string[] {
  const letters = sizes.letter ? [sizes.letter] : sizes.dress ? lettersForAu(sizes.dress) : []
  const numbers = sizes.dress ? [sizes.dress] : sizes.letter ? (LETTER_TO_AU[sizes.letter] ?? []) : []
  return [...new Set([...letters.flatMap(withPairs), ...numbers.map((n) => `AU${n}`)])]
}

/**
 * The size keys to look for on a slot of this garment, from the slot's own
 * labels when it has them, otherwise from the profile. Null means her size for
 * this garment is not known yet, and the filter accepts any size in stock (and
 * says so on the card) rather than finding nothing.
 */
export function wantedSizeKeys(
  garment: GarmentType,
  slotLabels: string[],
  sizes: Partial<Sizes>,
): string[] | null {
  const fromLabels = slotLabels.flatMap((label) => {
    const key = sizeKey(label, garment)
    if (!key) return []
    return LETTER_ORDER.includes(key) ? withPairs(key) : [key]
  })
  if (fromLabels.length > 0) return [...new Set(fromLabels)]

  switch (sizeGroup(garment)) {
    case 'tops': {
      const keys = clothingKeys(sizes)
      return keys.length > 0 ? keys : null
    }
    case 'bottoms': {
      const clothing = clothingKeys(sizes)
      const waist = sizes.jeans ?? (sizes.waist_cm ? Math.round(sizes.waist_cm / 2.54) : null)
      const waists = waist
        ? [waist]
        : clothing.flatMap((key) => (key.startsWith('AU') ? (AU_TO_WAIST[Number(key.slice(2))] ?? []) : []))
      const keys = [...new Set([...clothing, ...waists.map((inches) => `W${inches}`)])]
      return keys.length > 0 ? keys : null
    }
    case 'feet': {
      const keys = [
        sizes.shoe_eu ? `EU${sizes.shoe_eu}` : null,
        sizes.shoe_au ? `US${sizes.shoe_au}` : null,
        sizes.shoe_au ? `UK${sizes.shoe_au - 2}` : null,
      ].filter((key): key is string => key !== null)
      return keys.length > 0 ? keys : null
    }
    default:
      return null
  }
}
