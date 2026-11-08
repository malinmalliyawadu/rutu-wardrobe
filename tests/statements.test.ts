import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MODELS } from '../src/lib/claude.ts'
import {
  buildStatementRequest,
  ceilings,
  rankCandidates,
  statementContextBlock,
  statementFamilies,
  statementSignals,
  StatementSchema,
  tidyStatement,
  wearablePieces,
  type ProductForStatement,
} from '../src/lib/finder/statements.ts'
import type { Piece } from '../src/lib/pieces.ts'
import { qualitiesText } from '../src/lib/statements.ts'
import type { Guide } from '../src/lib/style-guide.ts'

import { guideFixture, profileFixture } from './fixtures.ts'

/* The statement rules and the judge's request, without a database or Claude. */

const guide: Pick<Guide, 'palette'> = {
  palette: {
    ...guideFixture.palette,
    best: [
      { hex: '#2f4a3a', name: 'pine', use: 'knitwear' },
      { hex: '#7a2e1f', name: 'oxblood', use: 'knitwear' },
      { hex: '#8a4a2a', name: 'tobacco', use: 'outerwear' },
      { hex: '#a0522d', name: 'brick', use: 'shirts' },
    ],
  },
}

const yellow: Pick<Guide, 'palette'> = {
  palette: { ...guideFixture.palette, best: [{ hex: '#c9a227', name: 'mustard', use: 'knitwear' }, { hex: '#a0522d', name: 'brick', use: 'tops' }] },
}

const listing = (title: string, extra: Partial<Parameters<typeof statementSignals>[0]> = {}) => ({
  product_id: 1,
  content_hash: 'h',
  title,
  vendor: null,
  product_type: null,
  tags: [],
  garment_type: 'shirt' as const,
  colours: [],
  image_src: null,
  image_colour_src: null,
  image_colours: null,
  ...extra,
})

test('her bold colours are her best colours that are not neutrals, however deep', () => {
  assert.deepEqual(statementFamilies(guide).sort(), ['green', 'red', 'rust'], 'tobacco is a brown, so a neutral')
  assert.deepEqual(statementFamilies(null), [], 'no guide, no bold colours')
})

test('the rules pick a piece for a bold colour of hers, a texture or a cut, and never for a pattern', () => {
  const bold = statementFamilies(guide)
  assert.deepEqual(statementSignals(listing('Rust Cotton Shirt'), bold), ['colour'])
  assert.deepEqual(statementSignals(listing('Navy Cotton Shirt'), bold), [], 'navy is a neutral')
  assert.deepEqual(statementSignals(listing('Poplin Shirt', { colours: ['Ecru', 'Brick'] }), bold), ['colour'], 'any colour in her size')
  assert.deepEqual(statementSignals(listing('Satin Midi Skirt - Navy', { garment_type: 'skirt' }), bold), ['texture'])
  assert.deepEqual(statementSignals(listing('Bouclé Cardigan', { garment_type: 'knitwear' }), bold), ['texture'], 'an accent is read as its plain letter')
  assert.deepEqual(statementSignals(listing('Cropped Jacket', { garment_type: 'jacket', tags: ['_Boucle'] }), bold), ['texture'], 'a material tag counts')
  assert.deepEqual(statementSignals(listing('Lace Trim Cami', { garment_type: 'top' }), bold), ['texture'])
  assert.deepEqual(statementSignals(listing('Lace-Up Top', { garment_type: 'top' }), bold), [], 'a lace-up is not lace')
  assert.deepEqual(statementSignals(listing('Pine Puff Sleeve Blouse', { garment_type: 'top' }), bold), ['colour', 'cut'])
  assert.deepEqual(statementSignals(listing('Drop Waist Midi Dress', { garment_type: 'dress' }), bold), ['cut'])
  assert.deepEqual(statementSignals(listing('Asymmetric Hem Skirt', { garment_type: 'skirt' }), bold), ['cut'])
  assert.deepEqual(statementSignals(listing('Linen Midi Dress', { garment_type: 'dress' }), bold), [], 'linen is most of a summer, not a statement')
  assert.deepEqual(statementSignals(listing('Wrap Dress', { garment_type: 'dress', tags: [':Bias Cut', 'Puff Sleeve'] }), bold), [], 'a cut only from the title: stores tag whole categories')
  assert.deepEqual(statementSignals(listing('Tiered Maxi Dress', { garment_type: 'dress' }), bold), [], 'tiers and a wrap are basics now')
  assert.deepEqual(statementSignals(listing('Padded Jacket', { garment_type: 'jacket', tags: ['Padded/Quilted Jackets'] }), bold), [], 'every puffer is quilted')
  assert.deepEqual(statementSignals(listing('Floral Print Midi Dress', { garment_type: 'dress' }), bold), [], 'a pattern alone is not what she means')
  assert.deepEqual(statementSignals(listing('Drawcord Trouser', { garment_type: 'trousers' }), bold), [], 'a drawcord is not cord')
  assert.deepEqual(
    statementSignals(listing('Suede Ballet Flat', { garment_type: 'flats' }), bold),
    [],
    'every flat is suede or leather: a shoe is picked by its colour, its cut or a surface that stands out',
  )
  assert.deepEqual(statementSignals(listing('Patent Slingback', { garment_type: 'heels' }), bold), ['texture'])
  assert.deepEqual(statementSignals(listing('Suede Mary Jane', { garment_type: 'flats' }), bold), ['cut'])
  assert.deepEqual(statementSignals(listing('Raffia Tote', { garment_type: 'bag' }), bold), ['texture'])
  assert.deepEqual(statementSignals(listing('Leather Shoulder Bag', { garment_type: 'bag' }), bold), [], 'a leather bag is a basic')
  assert.deepEqual(statementSignals(listing('Gold Sculptural Earrings', { garment_type: 'jewellery' }), bold), ['cut'])
  assert.deepEqual(
    statementSignals(listing('Rust Gold Hoops', { garment_type: 'jewellery', colours: ['Gold'] }), statementFamilies(yellow)),
    ['colour'],
    'a rust enamel is a colour',
  )
  assert.deepEqual(
    statementSignals(listing('Gold Hoops', { garment_type: 'jewellery', colours: ['Gold'] }), statementFamilies(yellow)),
    [],
    'gold is a metal, not her mustard',
  )
  assert.deepEqual(
    statementSignals(
      listing('Shirt', { image_src: 'https://x.test/a.jpg?v=2', image_colour_src: 'https://x.test/a.jpg', image_colours: ['#a0522d'] }),
      bold,
    ),
    ['colour'],
    'with no colour in the words, the photo read decides',
  )
})

test('two signals first, then the garments that carry an outfit, then the newest', () => {
  const at = (day: number) => new Date(`2026-11-0${day}`)
  const rows = [
    { product_id: 1, signals: ['colour' as const], garment_type: 'trousers' as const, first_seen_at: at(4) },
    { product_id: 2, signals: ['colour' as const], garment_type: 'jacket' as const, first_seen_at: at(1) },
    { product_id: 3, signals: ['colour' as const, 'texture' as const], garment_type: 'sneakers' as const, first_seen_at: at(1) },
    { product_id: 4, signals: ['colour' as const], garment_type: 'jacket' as const, first_seen_at: at(3) },
    { product_id: 5, signals: ['colour' as const], garment_type: 'dress' as const, first_seen_at: at(4) },
  ]
  assert.deepEqual(rankCandidates(rows).map((row) => row.product_id), [3, 4, 2, 5, 1])
})

test('the most she would pay: her budget for the kind, else the top of the blueprint’s bands, else none', () => {
  const result = ceilings({ knits: 250, outerwear: null, dresses: 300, shoes: 220 }, [
    { garment_type: 'jacket', budget_max_cents: 60000 },
    { garment_type: 'jacket', budget_max_cents: 90000 },
    { garment_type: 'knitwear', budget_max_cents: 40000 },
    { garment_type: 'shirt', budget_max_cents: null },
  ])
  assert.equal(result.knitwear, 25000, 'her own number wins')
  assert.equal(result.sweatshirt, 25000, 'knits covers sweatshirts too')
  assert.equal(result.dress, 30000)
  assert.equal(result.jumpsuit, 30000, 'dresses covers jumpsuits')
  assert.equal(result.heels, 22000, 'shoes covers every kind of shoe')
  assert.equal(result.boots, 22000)
  assert.equal(result.jacket, 90000)
  assert.equal(result.shirt, undefined)
})

const product: ProductForStatement = {
  product_id: 7,
  content_hash: 'abc',
  retailer: 'Kowtow',
  title: 'Corduroy Cropped Jacket',
  vendor: 'Kowtow',
  product_type: null,
  tags: [],
  body_html: '<p>Eight-wale cord.</p>',
  images: [{ src: 'https://cdn.shopify.com/s/files/1/x/files/jacket.jpg?v=1', width: 2000, height: 2500, alt: null }],
  colours: ['Rust', 'Navy'],
  sizes: ['S'],
  signals: ['colour', 'texture'],
}

test('the judge is Sonnet at low effort, the context cached, the photo and the listing after it', () => {
  const request = buildStatementRequest('context', product)
  assert.equal(request.model, MODELS.scoring)
  assert.equal(request.output_config.effort, 'low')
  assert.deepEqual(request.system[1], { type: 'text', text: 'context', cache_control: { type: 'ephemeral' } })
  const [image, text] = request.messages[0]!.content as { type: string; text?: string; source?: { url: string } }[]
  assert.equal(image!.type, 'image')
  assert.match(image!.source!.url, /width=768/)
  assert.match(text!.text!, /Eight-wale cord\./)
  assert.match(text!.text!, /picked it for its colour and texture/)
})

const piece = (id: number, name: string, fields: Partial<Piece> = {}): Piece =>
  ({ id, name, garment_type: 'trousers', colour_hex: null, colour_name: 'ink navy', fabric: 'cotton', fit: 'slim', worn_for: 'everyday', set_aside_at: null, ...fields }) as Piece

test('the context names the pieces she can wear it with, and says so when there are none', () => {
  const pieces = [
    piece(1, 'Ink navy wide-leg trousers'),
    piece(2, 'Bike shorts', { worn_for: 'gym' }),
    piece(3, 'Old jumper', { set_aside_at: new Date() }),
  ]
  assert.deepEqual(wearablePieces(pieces).map((p) => p.id), [1])
  const block = statementContextBlock({ profile: profileFixture, guide: guideFixture, pieces, dismissals: [] })
  assert.match(block, /"name":"Ink navy wide-leg trousers"/)
  assert.doesNotMatch(block, /Bike shorts|Old jumper/)
  assert.match(
    statementContextBlock({ profile: profileFixture, guide: guideFixture, pieces: [], dismissals: [] }),
    /leave wears_with empty/,
  )
})

test('tidying holds the verdict to what was offered, and nothing that stands out stays under the bar', () => {
  const parsed = StatementSchema.parse({
    qualities: ['texture', 'colour', 'texture'],
    score: 89,
    colour: 'Rust',
    why: 'Rust satin \u2014 the skirt to wear with your navy knit.',
    wears_with: [1, 99, 1, 2, 3, 4],
  })
  const tidied = tidyStatement(parsed, product, new Set([1, 2, 3, 4]))
  assert.deepEqual(tidied.qualities, ['colour', 'texture'])
  assert.equal(tidied.score, 89)
  assert.equal(tidyStatement({ ...parsed, score: 120 }, product, new Set()).score, 100)
  assert.equal(tidied.colour, 'Rust')
  assert.equal(tidied.why, 'Rust satin - the skirt to wear with your navy knit.')
  assert.deepEqual(tidied.wears_with, [1, 2, 3], 'her pieces only, once each, three at most')
  assert.equal(tidyStatement({ ...parsed, colour: 'Teal' }, product, new Set()).colour, null, 'not on sale in her size')
  assert.equal(tidyStatement({ ...parsed, qualities: [] }, product, new Set()).score, 39)
  assert.ok(!StatementSchema.safeParse({ ...parsed, score: 101 }).success)
})

test('what makes it one, in words', () => {
  assert.equal(qualitiesText(['colour']), 'Colour')
  assert.equal(qualitiesText(['colour', 'texture']), 'Colour and texture')
  assert.equal(qualitiesText(['colour', 'texture', 'cut']), 'Colour, texture and cut')
})
