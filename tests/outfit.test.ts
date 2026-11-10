import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { after, before, describe, test } from 'node:test'

import { connect, db, type Sql } from '../src/lib/db.ts'
import { recordAction } from '../src/lib/feed.ts'
import { writePage } from '../src/lib/finder/ingest.ts'
import { normaliseProduct, ShopifyProductSchema } from '../src/lib/finder/shopify.ts'
import { readLooks } from '../src/lib/looks.ts'
import {
  buildOutfitMessages,
  coversOutfit,
  getOutfit,
  listOutfits,
  pickForWant,
  POOL_CLOSEST,
  POOL_LIKED,
  runOutfit,
  startOutfit,
  tidyOutfit,
  wantTarget,
  type ComposeInput,
  type Composed,
  type OutfitDraft,
  type Plan,
  type PoolItem,
  type Want,
} from '../src/lib/outfit.ts'
import { createPiece } from '../src/lib/pieces.ts'
import { getProfile, saveSizes } from '../src/lib/profile.ts'
import { saveGuide } from '../src/lib/style-guide.ts'
import { startAskedOutfitTryOn } from '../src/lib/try-on.ts'
import type { GarmentType } from '../src/lib/wardrobe-values.ts'

import { guideFixture, profileFixture } from './fixtures.ts'

/* An outfit from scratch: the rules that need nothing, then whole asks against a real Postgres with Claude faked. */

const pieces = [
  { id: 1, garment_type: 'shirt', set_aside_at: null, worn_for: 'everyday' },
  { id: 2, garment_type: 'skirt', set_aside_at: null, worn_for: 'everyday' },
  { id: 3, garment_type: 'boots', set_aside_at: null, worn_for: 'everyday' },
  { id: 4, garment_type: 'knitwear', set_aside_at: new Date(), worn_for: 'everyday' },
  { id: 5, garment_type: 'tank', set_aside_at: null, worn_for: 'gym' },
  { id: 6, garment_type: 'dress', set_aside_at: null, worn_for: 'everyday' },
] as const

const pool = [
  { product_id: 101, garment_type: 'tailoring' },
  { product_id: 102, garment_type: 'shirt' },
  { product_id: 103, garment_type: 'trousers' },
  { product_id: 104, garment_type: 'heels' },
  { product_id: 105, garment_type: 'dress' },
] as const

const draft = (over: Partial<OutfitDraft>): OutfitDraft => ({
  title: ' Plum silk, gold sandals ',
  occasion: 'evening',
  weather: 'a cool evening',
  piece_ids: [],
  shop_items: [],
  ideas: [],
  why: 'Plum and ecru.',
  styling: null,
  ...over,
})

const shop = (...ids: number[]) => ids.map((id) => ({ id, why: ' the one ' }))

describe('what an outfit must be', () => {
  test('from both: her pieces and the shops’ in layer order, her own first, unknowns and repeats dropped', () => {
    const tidy = tidyOutfit(draft({ piece_ids: [3, 2, 2, 99, 4], shop_items: shop(102, 101, 101, 555) }), 'both', [...pieces], [...pool])
    assert.ok(tidy)
    assert.equal(tidy.title, 'Plum silk, gold sandals')
    assert.deepEqual(
      tidy.items.map((item) => item.piece_id ?? `f${item.product_id}`),
      ['f101', 'f102', 2, 3],
      'tailoring, the shirt, her skirt, her boots; the set-aside knit, piece 99 and product 555 are gone',
    )
    assert.equal(tidy.items[0]!.why, 'the one')
  })

  test('from the shops alone her pieces are left out, and what is left must still be whole', () => {
    assert.equal(tidyOutfit(draft({ piece_ids: [2, 3], shop_items: shop(101, 102) }), 'shops', [...pieces], [...pool]), null)
    const whole = tidyOutfit(draft({ piece_ids: [1], shop_items: shop(102, 103, 104) }), 'shops', [...pieces], [...pool])
    assert.deepEqual(whole?.items.map((item) => item.product_id), [102, 103, 104])
  })

  test('from her closet alone a product is left out; gym kit stays out of an everyday outfit', () => {
    const tidy = tidyOutfit(draft({ piece_ids: [1, 2, 3, 5], shop_items: shop(101) }), 'closet', [...pieces], [...pool])
    assert.deepEqual(tidy?.items.map((item) => item.piece_id), [1, 2, 3])
  })

  test('from anything: only the garments described, whole by their garments, a bad hex dropped', () => {
    const idea = (garment_type: 'shirt' | 'skirt' | 'heels', colour_hex: string) => ({
      garment_type, name: ` Ecru ${garment_type} `, colour_name: 'ecru', colour_hex, fabric: null, fit: ' regular ', why: 'the base', search: `ecru ${garment_type}`,
    })
    const ideas = [idea('heels', '#33221A'), idea('shirt', 'cream'), idea('skirt', '#33221a')]
    const tidy = tidyOutfit(draft({ piece_ids: [1], shop_items: shop(101), ideas }), 'anywhere', [...pieces], [...pool])
    assert.deepEqual(tidy?.items.map((item) => item.idea?.name), ['Ecru shirt', 'Ecru skirt', 'Ecru heels'], 'in layer order; her piece and the product are left out')
    assert.deepEqual(tidy?.items.map((item) => item.idea?.colour_hex), [null, '#33221a', '#33221a'])
    assert.equal(tidy?.items[0]!.idea?.fit, 'regular')
    assert.equal(tidyOutfit(draft({ piece_ids: [1, 2, 3], ideas: [] }), 'anywhere', [...pieces], [...pool]), null, 'nothing described is no outfit')
    assert.deepEqual(
      tidyOutfit(draft({ piece_ids: [1, 2, 3], ideas }), 'closet', [...pieces], [...pool])?.items.map((item) => item.piece_id),
      [1, 2, 3],
      'a described garment is left out of any other source',
    )
  })

  test('a skirt and trousers are not an outfit', () => {
    assert.equal(tidyOutfit(draft({ piece_ids: [1, 2, 3], shop_items: shop(103) }), 'both', [...pieces], [...pool]), null)
  })

  test('a dress stands in for a top and a bottom, and cannot go over either bottom', () => {
    const dress = tidyOutfit(draft({ piece_ids: [6, 3] }), 'closet', [...pieces], [...pool])
    assert.deepEqual(dress?.items.map((item) => item.piece_id), [6, 3])
    assert.equal(tidyOutfit(draft({ piece_ids: [6, 2, 3] }), 'closet', [...pieces], [...pool]), null, 'a dress with a skirt')
    assert.deepEqual(tidyOutfit(draft({ piece_ids: [1, 6, 3] }), 'closet', [...pieces], [...pool])?.items.map((item) => item.piece_id), [1, 6, 3], 'a shirt over a dress')
  })

  test('no more than a try-on takes', () => {
    const idea = (garment_type: GarmentType, name: string) => ({ garment_type, name, colour_name: 'plum', colour_hex: '#5b2a4a', fabric: null, fit: null, why: 'x', search: name })
    const nine = [idea('coat', 'a'), idea('tailoring', 'b'), idea('dress', 'c'), idea('heels', 'd'), idea('belt', 'e'), idea('bag', 'f'), idea('jewellery', 'g'), idea('accessory', 'h'), idea('knitwear', 'i')]
    assert.equal(tidyOutfit(draft({ ideas: nine }), 'anywhere', [...pieces], [...pool]), null)
    assert.equal(tidyOutfit(draft({ ideas: nine.slice(0, 8) }), 'anywhere', [...pieces], [...pool])?.items.length, 8)
  })

  test('the pool dresses her alone with a dress or a top and a bottom, and shoes', () => {
    assert.equal(coversOutfit([...pool]), true)
    assert.equal(coversOutfit(pool.filter((item) => item.garment_type !== 'heels')), false)
    assert.equal(coversOutfit([{ garment_type: 'dress' }, { garment_type: 'sandals' }]), true)
    assert.equal(coversOutfit([{ garment_type: 'top' }, { garment_type: 'sandals' }]), false)
  })
})

describe('what the shops are asked for', () => {
  const want: Want = { garment_type: 'tailoring', words: ['blazer', 'wool'], colours: ['plum'], max_nzd: null, role: 'the jacket' }

  test('a want is the filter’s target: its place in the plan, her size, her ceiling unless the brief gave a price', () => {
    const target = wantTarget(want, 2, { letter: 'S' }, () => ['regular'], { tailoring: 60000 })
    assert.equal(target.slot_id, 3)
    assert.equal(target.garment_type, 'tailoring')
    assert.equal(target.max_cents, 60000)
    assert.ok(target.families && target.families.length > 0)
    assert.deepEqual(target.fits, ['regular'])
    assert.equal(wantTarget({ ...want, max_nzd: 400 }, 0, {}, () => [], { tailoring: 60000 }).max_cents, 40000)
    assert.equal(wantTarget(want, 0, {}, () => [], {}).max_cents, null)
  })

  test('Opus sees the closest of each, then the best of the rest she saved or Claude rated well', () => {
    const ranked = Array.from({ length: 30 }, (_, index) => ({ product_id: index + 1 }))
    const liked = new Map([
      [3, { rated: 95, saved: true }],
      [15, { rated: 72, saved: false }],
      [16, { rated: 60, saved: false }],
      [20, { rated: null, saved: true }],
      [22, { rated: 90, saved: false }],
      [25, { rated: 80, saved: false }],
      [28, { rated: 75, saved: false }],
    ])
    const picked = pickForWant(ranked, liked).map((product) => product.product_id)
    assert.deepEqual(picked.slice(0, POOL_CLOSEST), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    assert.deepEqual(picked.slice(POOL_CLOSEST), [20, 22, 25, 28], 'saved first, then by score; 60 is not well rated, 72 is cut by the limit')
    assert.equal(picked.length, POOL_CLOSEST + POOL_LIKED)
  })

  test('the ask to Opus carries only what the outfit may use', () => {
    const item: PoolItem = {
      product_id: 101, want: 0, garment_type: 'tailoring', title: 'Plum Wool Blazer', vendor: 'Label', retailer: 'Shop', colours: ['Plum'],
      about: 'Softly tailored.', price_cents: 45000, compare_at_cents: null, nzd_cents: 45000, sizes: ['M'], size_known: true, rated: 84, saved: false,
    }
    const input: ComposeInput = {
      brief: 'a wedding on Saturday', source: 'shops', profile: profileFixture, guide: guideFixture, pieces: [],
      history: { worn: new Map() }, pool: [item], wants: [want], now: new Date('2026-11-10T00:00:00Z'),
    }
    const content = buildOutfitMessages(input)[0]!.content as string
    const body = JSON.parse(content.slice(0, content.lastIndexOf('\n\n')))
    assert.equal(body.made_from, 'the shops alone')
    assert.equal(body.her_pieces, undefined)
    assert.deepEqual(body.shop[0], {
      id: 101, name: 'Plum Wool Blazer', brand: 'Label', shop: 'Shop', garment: 'tailoring', for: 'the jacket',
      colours: ['Plum'], price_nzd: 450, about: 'Softly tailored.', rated: 84,
    })
    assert.match(content, /Her brief: "a wedding on Saturday"\. Put the outfit together\.$/)

    const mine = JSON.parse((buildOutfitMessages({ ...input, source: 'closet', brief: '' })[0]!.content as string).split('\n\nShe gave no brief')[0]!)
    assert.equal(mine.shop, undefined)
    assert.deepEqual(mine.her_pieces, [])
  })
})

describe('an outfit asked for, made and read', () => {
  const scratch = `wardrobe_outfit_${process.pid}_${Date.now()}`
  let admin: Sql
  let sql: Sql
  const own: Record<string, number> = {}

  let nextId = 7000
  function product(title: string, sizes: Record<string, number>) {
    nextId += 10
    const id = nextId
    return ShopifyProductSchema.parse({
      id,
      title,
      handle: `p-${id}`,
      product_type: '',
      tags: [],
      options: [{ name: 'Size', position: 1, values: Object.keys(sizes) }],
      variants: Object.entries(sizes).map(([size, price], index) => ({ id: id + index + 1, option1: size, title: size, price: price.toFixed(2), available: true })),
      images: [{ src: `https://cdn.shopify.com/s/files/${id}.jpg?v=1` }],
    })
  }

  before(async () => {
    assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be set for the outfit database test')
    admin = connect({ max: 1 })
    await admin.unsafe(`create database ${scratch}`)
    const url = new URL(process.env.DATABASE_URL)
    url.pathname = `/${scratch}`
    execFileSync(process.execPath, ['scripts/migrate.ts'], { env: { ...process.env, DATABASE_URL: url.toString() } })
    process.env.DATABASE_URL = url.toString()
    sql = connect({ max: 2 })

    await getProfile()
    await saveSizes(
      null,
      { letter: 'S', dress: 10, jeans: null, bust_cm: null, waist_cm: null, hips_cm: null, inseam_cm: null, shoe_eu: 38, shoe_au: null },
      { tops: null, knits: null, dresses: null, bottoms: null, outerwear: null },
    )
    const [shopRow] = await sql<{ id: number }[]>`
      insert into retailers (slug, name, platform, base_url, country, currency, catalogue)
      values ('shop', 'Shop', 'shopify', 'https://shop.test', 'NZ', 'NZD', 'womenswear')
      returning id::int as id
    `
    const local = { base_url: 'https://shop.test', catalogue: 'womenswear' as const }
    await writePage(
      sql,
      shopRow!.id,
      [
        product('Plum Wool Blazer', { S: 450, M: 450 }),
        product('White Poplin Shirt', { S: 120, L: 120 }),
        product('Pink Poplin Shirt', { S: 110 }),
        product('White Linen Shirt', { L: 130 }),
        product('Charcoal Pleated Skirt', { '10': 220 }),
        product('Brown Leather Heels', { '38 EU': 300 }),
      ].map((item) => normaliseProduct(item, local)),
    )

    const typed = { source: 'typed' as const, photo_id: null, product_id: null }
    for (const [name, garment_type] of [
      ['Ecru silk shirt', 'shirt'],
      ['Pine crew', 'knitwear'],
      ['Putty midi skirt', 'skirt'],
      ['Brown Chelseas', 'boots'],
    ] as const) {
      own[name] = await createPiece(
        { name, garment_type, colour_hex: null, colour_name: null, fabric: null, fit: null, warmth: null, worn_for: 'everyday', brand: null, size: null, notes: null, slot_id: null },
        typed,
      )
    }
  })

  after(async () => {
    await sql?.end()
    await db().end()
    await admin.unsafe(`drop database if exists ${scratch} with (force)`)
    await admin.end()
  })

  const meta = { model: 'claude-opus-5-5', served_by: 'claude-opus-5-5', input_tokens: 10_000, output_tokens: 1_000, generated_at: '' }
  const plan: Plan = {
    understood: true,
    problem: null,
    wants: [
      { garment_type: 'tailoring', words: ['blazer'], colours: ['plum'], max_nzd: null, role: 'the jacket' },
      { garment_type: 'shirt', words: ['poplin'], colours: ['white'], max_nzd: null, role: 'the shirt' },
      { garment_type: 'skirt', words: ['pleated'], colours: ['charcoal'], max_nzd: null, role: 'the skirt' },
      { garment_type: 'heels', words: ['leather'], colours: ['brown'], max_nzd: null, role: 'the shoes' },
    ],
  }
  const planned = (answer: Plan | null) => async () => ({ plan: answer, usd: 0.01 })
  let seen: ComposeInput | null = null
  /** Opus's answer as a fixture: each outfit names products by title and pieces by name. */
  const composed =
    (...outfits: { products?: string[]; pieces?: string[] }[]) =>
    async (input: ComposeInput): Promise<Composed> => {
      seen = input
      const id = (title: string) => input.pool.find((item) => item.title === title)?.product_id ?? 999_999
      return {
        outfits: outfits.map((outfit) =>
          draft({ piece_ids: (outfit.pieces ?? []).map((name) => own[name]!), shop_items: (outfit.products ?? []).map((title) => ({ id: id(title), why: 'the one' })) }),
        ),
        meta,
        usd: 0.06,
      }
    }

  test('without a style guide it is not started', async () => {
    const started = await startOutfit({ brief: 'a wedding', source: 'shops' }, sql)
    assert.equal(started.ok, false)
    await saveGuide(guideFixture, { model: 'fixture', served_by: 'fixture', input_tokens: 0, output_tokens: 0, generated_at: new Date().toISOString() })
  })

  test('from the shops: planned, found in her size, put together, priced and saved from', async () => {
    const started = await startOutfit({ brief: '  a wedding   on Saturday ', source: 'shops' }, sql)
    assert.ok(started.ok)
    assert.deepEqual(await startOutfit({ brief: '', source: 'closet' }, sql), { ok: false, message: 'Another outfit is still being made. One at a time.' })
    assert.equal((await getOutfit(null, sql))?.status, 'making')

    const outcome = await runOutfit(started.id, {
      sql,
      plan: planned(plan),
      compose: composed({ products: ['Plum Wool Blazer', 'White Poplin Shirt', 'Charcoal Pleated Skirt', 'Brown Leather Heels'], pieces: ['Pine crew'] }),
    })
    assert.equal(outcome, 'ready')
    assert.deepEqual(
      seen!.pool.map((item) => item.title).sort(),
      ['Brown Leather Heels', 'Charcoal Pleated Skirt', 'Plum Wool Blazer', 'White Poplin Shirt'],
      'the pink shirt is the wrong colour and the linen one is not made in her S',
    )

    const view = await getOutfit(started.id, sql)
    assert.ok(view)
    assert.equal(view.status, 'ready')
    assert.equal(view.brief, 'a wedding on Saturday', 'kept as typed, spaces tidied')
    assert.equal(view.look, null, 'an outfit with the shops in it is not a look')
    assert.deepEqual(
      view.parts.map((part) => part.name),
      ['Plum Wool Blazer', 'White Poplin Shirt', 'Charcoal Pleated Skirt', 'Brown Leather Heels'],
      'outermost first; her knit was left out of an outfit from the shops alone',
    )
    assert.equal(view.to_buy_cents, 109000)
    const shirt = view.parts[1]!.product!
    assert.deepEqual(shirt.sizes, ['S'], 'her size')
    assert.equal(shirt.price.nzdCents, 12000)
    assert.ok(Math.abs(view.usd - 0.07) < 1e-9, 'the plan and the outfit')

    await recordAction({ action: 'saved', product_id: shirt.product_id, slot_id: null }, sql)
    const [saved] = await sql<{ price_cents: number; size: string }[]>`
      select price_cents, size from feed_actions where product_id = ${shirt.product_id}
    `
    assert.deepEqual({ ...saved }, { price_cents: 12000, size: 'S' }, 'saved at the price and size the outfit found')
    const after = await getOutfit(started.id, sql)
    assert.equal(after!.parts[1]!.product!.state, 'saved')

    // "See it on me" takes the outfit's products though only one is saved; with no key it stops there.
    const key = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    const tryOn = await startAskedOutfitTryOn(started.id, sql)
    if (key) process.env.OPENAI_API_KEY = key
    assert.deepEqual(tryOn, { ok: false, message: 'Try-on needs an OpenAI key: add OPENAI_API_KEY to the server’s environment.' })
  })

  test('from her closet: the outfit is a look in a set of its own kind, and the first that holds is kept', async () => {
    const started = await startOutfit({ brief: '', source: 'closet' }, sql)
    assert.ok(started.ok)
    const outcome = await runOutfit(started.id, {
      sql,
      plan: async () => assert.fail('nothing is planned for her own closet'),
      compose: composed({ pieces: ['Ecru silk shirt', 'Pine crew'] }, { pieces: ['Pine crew', 'Putty midi skirt', 'Brown Chelseas'] }),
    })
    assert.equal(outcome, 'ready')
    const view = await getOutfit(null, sql)
    assert.equal(view!.id, started.id, 'the newest')
    assert.ok(view!.look, 'made only of her pieces, it is a look')
    assert.deepEqual(view!.look.pieces.map((piece) => piece.name), ['Pine crew', 'Putty midi skirt', 'Brown Chelseas'])
    assert.equal(view!.look.status, 'new')
    const [set] = await sql<{ kind: string; note: string | null }[]>`select kind, note from look_sets where id = ${view!.look.set_id}`
    assert.deepEqual({ ...set }, { kind: 'ask', note: null })
    assert.equal((await readLooks(sql)).latest, null, 'the Looks section has no set of its own yet')
  })

  test('from both: an outfit that turns out all her own is a look, the one already made', async () => {
    const started = await startOutfit({ brief: 'dinner', source: 'both' }, sql)
    assert.ok(started.ok)
    const outcome = await runOutfit(started.id, {
      sql,
      plan: planned({ understood: true, problem: null, wants: [] }),
      compose: composed({ pieces: ['Brown Chelseas', 'Putty midi skirt', 'Pine crew'] }),
    })
    assert.equal(outcome, 'ready')
    const [first, second] = [await getOutfit(started.id, sql), (await listOutfits(9, sql))[1]!]
    const earlier = await getOutfit(second.id, sql)
    assert.equal(first!.look!.id, earlier!.look!.id, 'the same pieces are the same look')
  })

  test('from anything: nothing is planned or read from the shops, and the garments described are kept as written', async () => {
    const started = await startOutfit({ brief: 'a gallery opening', source: 'anywhere' }, sql)
    assert.ok(started.ok)
    const idea = (garment_type: 'dress' | 'heels' | 'jewellery', name: string) => ({
      garment_type, name, colour_name: 'oxblood', colour_hex: '#7A2E1F', fabric: 'merino', fit: null, why: 'the colour near your face', search: name.toLowerCase(),
    })
    const outcome = await runOutfit(started.id, {
      sql,
      plan: async () => assert.fail('nothing is planned for an outfit from anything'),
      compose: async (input) => {
        assert.deepEqual(input.pool, [])
        return { outfits: [draft({ ideas: [idea('heels', 'Brown suede block heels'), idea('jewellery', 'Small gold hoops'), idea('dress', 'Oxblood crepe midi dress')] })], meta, usd: 0.05 }
      },
    })
    assert.equal(outcome, 'ready')
    const view = await getOutfit(started.id, sql)
    assert.equal(view!.look, null)
    assert.equal(view!.on_me, null, 'no picture has been made yet')
    assert.equal(view!.to_buy_cents, 0)
    assert.deepEqual(view!.parts.map((part) => part.name), ['Oxblood crepe midi dress', 'Brown suede block heels', 'Small gold hoops'])
    assert.deepEqual(view!.parts[0]!.idea, {
      garment_type: 'dress', name: 'Oxblood crepe midi dress', colour_name: 'oxblood', colour_hex: '#7a2e1f', fabric: 'merino', fit: null,
      why: 'the colour near your face', search: 'oxblood crepe midi dress',
    })
    // Its picture of her is made from the words; with no key it stops there, like any try-on.
    const key = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    const tryOn = await startAskedOutfitTryOn(started.id, sql)
    if (key) process.env.OPENAI_API_KEY = key
    assert.deepEqual(tryOn, { ok: false, message: 'Try-on needs an OpenAI key: add OPENAI_API_KEY to the server’s environment.' })
  })

  test('the picture of an outfit from anything sends her photo and words, nothing else, and is found again by the outfit', async () => {
    const started = await startOutfit({ brief: 'a gallery opening', source: 'anywhere' }, sql)
    assert.ok(started.ok)
    const ideas = [
      { garment_type: 'heels' as const, name: 'Brown suede block heels', colour_name: 'chocolate', colour_hex: '#33221a', fabric: 'suede', fit: null, why: 'x', search: 'brown suede block heels' },
      { garment_type: 'dress' as const, name: 'Oxblood crepe midi dress', colour_name: 'oxblood', colour_hex: '#7a2e1f', fabric: 'crepe', fit: 'bias', why: 'x', search: 'oxblood crepe midi dress' },
    ]
    await runOutfit(started.id, { sql, compose: async () => ({ outfits: [draft({ title: 'Oxblood crepe', ideas })], meta, usd: 0.05 }) })

    const key = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-key'
    try {
      const refused = await startAskedOutfitTryOn(started.id, sql)
      assert.deepEqual(refused, { ok: false, message: 'Add a full-length photo under Me, Photos first.' }, 'nothing is recorded without her photo')

      await sql`insert into profile_photos ${sql({ kind: 'full_body', path: 'profile/her.jpg', mime: 'image/jpeg', bytes: 1, width: 900, height: 1600, sha256: 'x'.repeat(64) })}`
      const recorded = await startAskedOutfitTryOn(started.id, sql)
      assert.ok(recorded.ok)
      const [row] = await sql<{ outfit_key: string; product_id: number | null; look_id: number | null; product_image: string | null; pieces: { name: string; shown: { kind: string } }[] }[]>`
        select outfit_key, product_id, look_id, product_image, pieces from try_ons where id = ${recorded.id}
      `
      assert.equal(row!.outfit_key, `a${started.id}`)
      assert.equal(row!.product_image, null)
      assert.deepEqual(row!.pieces.map((piece) => piece.name), ['Oxblood crepe midi dress', 'Brown suede block heels'], 'outermost first')
      assert.deepEqual(row!.pieces.map((piece) => piece.shown.kind), ['words', 'words'], 'no garment photo goes with it')
      assert.equal((await getOutfit(started.id, sql))!.on_me?.id, recorded.id)

      await sql`update try_ons set status = 'ready', finished_at = now() where id = ${recorded.id}`
      const again = await startAskedOutfitTryOn(started.id, sql)
      assert.deepEqual(again, { ok: true, id: recorded.id, reused: true }, 'the picture kept is the answer to a second tap')
    } finally {
      if (key === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = key
    }
  })

  test('a brief that is not about getting dressed fails in Claude’s words; an outfit that does not hold fails in ours', async () => {
    const odd = await startOutfit({ brief: 'the weather in Lisbon', source: 'shops' }, sql)
    assert.ok(odd.ok)
    assert.equal(await runOutfit(odd.id, { sql, plan: planned({ understood: false, problem: 'That is not something to dress for.', wants: [] }) }), 'failed')
    assert.equal((await getOutfit(odd.id, sql))!.error, 'That is not something to dress for.')

    const loose = await startOutfit({ brief: 'a wedding', source: 'shops' }, sql)
    assert.ok(loose.ok)
    assert.equal(await runOutfit(loose.id, { sql, plan: planned(plan), compose: composed({ products: ['Plum Wool Blazer', 'White Poplin Shirt'] }) }), 'failed')
    const view = await getOutfit(loose.id, sql)
    assert.equal(view!.error, 'The outfit Claude made did not hold together. Try again.')
    assert.deepEqual(view!.parts, [])
  })
})
