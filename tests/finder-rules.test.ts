import assert from 'node:assert/strict'
import { test } from 'node:test'

import sharp from 'sharp'

import { categoryText, garmentOf, isWomenswear, kitGarmentOf, sizeKey, slotKind, wantedSizeKeys } from '../src/lib/finder/classify.ts'
import { colourCompatible, cutCompatible, familiesIn, namedCut, productFamilies, slotFamilies } from '../src/lib/finder/colour.ts'
import { readPhoto } from '../src/lib/finder/photo-colour.ts'

/* Cases in the words NZ womenswear shops use for their listings and sizes. */

test('garment types from real titles and product types', () => {
  const cases: [string, string | null, string | null, string?][] = [
    ['Ecology Ring Spun Tee - Washed Black', 'T-Shirts', 'tee'],
    ['Cap Sleeve Tee', 'Tees', 'tee'],
    ['Organic Rib Tank', 'Tops', 'tank'],
    ['Silk Cami - Champagne', 'Tops', 'tank'],
    ['Silk Blouse', null, 'top'],
    ['Corset Top', null, 'top'],
    ['Bodysuit', 'Tops', 'top'],
    ['Classic Poplin Shirt', 'Shirts', 'shirt'],
    ['Merino Crew', 'Knitwear', 'knitwear'],
    ['Cotton Cardigan', null, 'knitwear'],
    ['Australian Cotton Crew Sweat', 'Sweat - Casual', 'sweatshirt'],
    ['Poplin Shirt Dress', 'Dresses', 'dress'],
    ['Linen Midi Dress', null, 'dress'],
    ['Drop Waist Dress', null, 'dress'],
    ['Ring Detail Midi Dress', null, 'dress'],
    ['Linen Dress With Belt', null, 'dress'],
    ['T-Shirt Dress', null, 'dress'],
    ['Linen Jumpsuit', null, 'jumpsuit'],
    ['Satin Bias Midi Skirt', 'Skirts', 'skirt'],
    ['Denim Mini Skirt', null, 'skirt'],
    ['Knit Midi Skirt', null, 'skirt'],
    ['Tailored Dress Pants', 'Pants', 'trousers'],
    ['Wide Leg Trouser', 'Pants', 'trousers'],
    ['Flat Front Trouser', null, 'trousers'],
    ['Mom Jean - Vintage Blue', 'Denim', 'jeans'],
    ['Boot Cut Jean', null, 'jeans'],
    ['Relaxed Linen Short', 'Shorts', 'shorts'],
    ['Oversized Blazer', 'Jackets', 'tailoring'],
    ['Leather Biker Jacket', null, 'jacket'],
    ['Puffer Vest', null, 'jacket'],
    ['Crop Puffer Jacket', null, 'jacket'],
    ['Short Wool Coat', 'Coats', 'coat'],
    ['Cropped Trench', null, 'coat'],
    ['Strappy Heeled Sandal', 'Footwear', 'heels'],
    ['Kitten Heel Slingback', null, 'heels'],
    ['Leather Slide', 'Footwear', 'sandals'],
    ['Ballet Flat', 'Shoes', 'flats'],
    ['Leather Loafer', 'Footwear', 'flats'],
    ['Suede Knee High Boot', 'Footwear', 'boots'],
    ['Samba OG', 'Sneakers', 'sneakers'],
    ['Leather Tote', null, 'bag'],
    ['Mini Shoulder Bag', null, 'bag'],
    ['Leather Belt', null, 'belt'],
    ['Gold Huggie Hoops', 'Jewellery', 'jewellery', 'earrings'],
    ['Pearl Drop Earrings', null, 'jewellery', 'earrings'],
    ['Pearl Pendant Necklace', null, 'jewellery', 'necklace'],
    ['Chain Bracelet', null, 'jewellery', 'bracelet'],
    ['Signet Ring', 'Jewellery', 'jewellery', 'ring'],
    ['Wool Scarf', null, 'accessory', 'scarf'],
    ['Tortoiseshell Claw Clip', null, 'accessory', 'hair'],
    ['Wool Beret', null, 'accessory', 'hat'],
    ["Women's Down Sweater™", 'Medium,Tops', 'jacket'],
    ["Women's Better Sweater® 1/4-Zip", 'Fleece', 'sweatshirt'],
    ['Short Sleeve Linen Shirt', 'Shirts', 'shirt'],
  ]
  for (const [title, type, garment, kind] of cases) {
    const result = garmentOf(title, type)
    assert.equal(result.garment_type, garment, title)
    if (kind) assert.equal(result.garment_kind, kind, title)
  }
})

test('a store that files bags under "Bags and Wallets" still has bags; its cases and sleeves are not', () => {
  const type = 'Womens - Accessories - Bags and Wallets'
  assert.equal(garmentOf('Elly Tote Embossed - Dark Brown', type).garment_type, 'bag')
  assert.equal(garmentOf('Pleated Baggu - Gradient Stripe Poppy Lilac', type).garment_type, 'bag')
  assert.equal(garmentOf('Puffy Laptop Sleeve 13Inch - Cherries', type).garment_type, null)
  assert.equal(garmentOf('Puffy Earbuds Case - Pink Houndstooth', type).garment_type, null)
  assert.equal(garmentOf('Small Cosmetic Case - Strawberry Blossom', type).garment_type, null)
  assert.equal(garmentOf('Penny Zip Wallet Silver', 'Wallet').garment_type, null)
})

test("a store's two-garment category gives way to the product's own name", () => {
  assert.equal(garmentOf('Rory Jacket - Ecru', 'Coats & Jackets').garment_type, 'jacket')
  assert.equal(garmentOf('Symi Dress (Rosette Haze Cotton) Morning Light', 'Dresses & Jumpsuits').garment_type, 'dress')
  assert.equal(garmentOf('Isle Shirtdress (Afterglow Floral Cotton) Blanc', 'Dresses & Jumpsuits').garment_type, 'dress')
  assert.equal(garmentOf('Ballerina Maxi Skirt White', 'Skirts').garment_type, 'skirt')
  assert.equal(garmentOf('Chelsea Crinkle Tank Polka Dot', 'Tops').garment_type, 'tank')
  assert.equal(garmentOf('Prime Chelsea Boot / Black', 'Footwear').garment_type, 'boots')
})

test('a hair claw is a hair accessory, a charm is jewellery', () => {
  assert.deepEqual(garmentOf('Squiggle Hair Claw Gold', 'Hair Accessory'), { garment_type: 'accessory', garment_kind: 'hair' })
  assert.equal(garmentOf('Crab Charm | 9ct Yellow Gold', 'Charms').garment_type, 'jewellery')
})

test('never a slot: swimwear, underwear, sleepwear, hosiery, sunglasses, towels', () => {
  for (const [title, type] of [
    ['Ribbed Bikini Top', 'Swim'],
    ['Lace Bralette', 'Lingerie'],
    ['Cotton Brief 3 Pack', null],
    ['Silk Pyjama Set', null],
    ['Sheer Tights', 'Hosiery'],
    ['Cat Eye Sunglasses', null],
    ['Waffle Bath Towel', 'Home'],
    ['Digital Gift Card', null],
    ['Linen Robe', null],
  ] as const) {
    assert.equal(garmentOf(title, type).garment_type, null, title)
  }
  assert.equal(garmentOf('Ring Spun Tee', 'T-Shirts').garment_type, 'tee', '"ring" in a title is not jewellery')
})

test('sport kit is activewear, so it never fills a style slot', () => {
  assert.equal(garmentOf('Gel-Nimbus 26', 'Running Shoes').garment_type, 'activewear')
  assert.equal(garmentOf('Align High-Rise Legging 25"', null).garment_type, 'activewear')
  assert.equal(garmentOf('Energy Sports Bra', null).garment_type, 'activewear', 'a sports bra is kit, not underwear')
  assert.equal(garmentOf('Pleated Tennis Skirt', null).garment_type, 'activewear')
  assert.equal(garmentOf("Women's Capilene® Cool Daily Shirt", 'Tops - S/S').garment_type, 'activewear', 'Capilene is a technical fabric')
  assert.equal(garmentOf('Samba OG', 'Sneakers').garment_type, 'sneakers', 'a lifestyle sneaker is not kit')
})

test('as a piece she owns, sport kit is the garment it is', () => {
  assert.equal(kitGarmentOf('Gel-Nimbus 26', 'Running Shoes'), 'flats', 'a shoe the rules cannot place further')
  assert.equal(kitGarmentOf('Training Singlet', null), 'tank')
  assert.equal(kitGarmentOf('Energy Sports Bra', null), 'tank', 'a sports bra is the top she trains in')
  assert.equal(kitGarmentOf('Align High-Rise Legging 25"', null), 'trousers')
  assert.equal(kitGarmentOf('Speed Up Bike Short', null), 'shorts')
})

test("a store's empty product type is read from its category tags", () => {
  const type = categoryText(null, ['cat_high:Apparel', 'cat_low:Dresses', 'cat_med:Clothing', 'gender:Womens'])
  assert.equal(garmentOf('Odette Midi', type).garment_type, 'dress')
})

test('womenswear: a womenswear store needs only not to say men or kids; a mixed store must say women', () => {
  const base = { title: 'Box Tee', productType: 'Tops', tags: [] as string[] }
  assert.ok(isWomenswear({ ...base, catalogue: 'womenswear' }))
  assert.ok(!isWomenswear({ ...base, title: 'MENS HEAVY BOX TEE', catalogue: 'womenswear' }))
  assert.ok(!isWomenswear({ ...base, catalogue: 'mixed' }))
  assert.ok(isWomenswear({ ...base, tags: ['Womens'], catalogue: 'mixed' }))
  assert.ok(isWomenswear({ ...base, tags: ['Gender:Unisex'], catalogue: 'mixed' }))
  assert.ok(!isWomenswear({ ...base, tags: ['Gender:Men'], catalogue: 'mixed' }))
  assert.ok(isWomenswear({ ...base, tags: ['Woman Man Nov 2026'], catalogue: 'mixed' }), 'says women as well as men')
  assert.ok(!isWomenswear({ ...base, tags: ['Girls', 'Womens'], catalogue: 'mixed' }), 'kids never')
  assert.ok(isWomenswear({ ...base, title: 'Girlfriend Jean', catalogue: 'womenswear' }), 'a girlfriend jean is not kids')
  assert.ok(
    !isWomenswear({ ...base, productType: 'Mens Pants', tags: ['Womens', 'Womens: Pants'], catalogue: 'mixed' }),
    "a men's product type outweighs a loose women tag",
  )
  assert.ok(
    isWomenswear({ ...base, productType: 'Mens Denim', tags: ['Gender:Men', 'Gender:Women'], catalogue: 'mixed' }),
    'but not a gender tag',
  )
})

test('size keys by garment', () => {
  assert.equal(sizeKey('Small', 'tee'), 'S')
  assert.equal(sizeKey('S/M', 'tee'), 'S/M')
  assert.equal(sizeKey('8 (S)', 'dress'), 'S', 'a number with its letter reads as the letter')
  assert.equal(sizeKey('XS / 6', 'top'), 'XS')
  assert.equal(sizeKey('AU 10', 'dress'), 'AU10')
  assert.equal(sizeKey('10', 'skirt'), 'AU10')
  assert.equal(sizeKey('US 4', 'dress'), 'AU8', 'US women is four under AU')
  assert.equal(sizeKey('EU 38', 'top'), 'AU10')
  assert.equal(sizeKey('IT 42', 'dress'), 'AU10')
  assert.equal(sizeKey('US 5', 'dress'), null, 'an odd number is a junior size, never guessed at')
  assert.equal(sizeKey('26', 'jeans'), 'W26')
  assert.equal(sizeKey('27/30', 'jeans'), 'W27')
  assert.equal(sizeKey('W28 L32', 'jeans'), 'W28')
  assert.equal(sizeKey('27"', 'jeans'), 'W27')
  assert.equal(sizeKey('2', 'jeans'), null, "a label's own 0 to 3 means something different at every label")
  assert.equal(sizeKey('38', 'heels'), 'EU38')
  assert.equal(sizeKey('37.5', 'flats'), 'EU37.5')
  assert.equal(sizeKey('AU 7', 'sandals'), 'US7', 'AU women is the US number')
  assert.equal(sizeKey('7', 'heels'), 'US7')
  assert.equal(sizeKey('UK 5', 'boots'), 'UK5')
  assert.equal(sizeKey('O/S', 'accessory'), 'ONE')
  assert.equal(sizeKey('One Size', 'jewellery'), 'ONE')
  assert.equal(sizeKey('OSA', 'bag'), 'ONE')
  assert.equal(sizeKey('Default Title', null), 'ONE')
  assert.equal(sizeKey('XXXX LARGE', 'tee'), null)
  assert.equal(sizeKey('Ocean', 'tee'), null)
})

test('her sizes: a letter covers neighbouring pairs and its AU numbers, and the other way round; unknown sizes are null', () => {
  assert.deepEqual(wantedSizeKeys('dress', [], { letter: 'S' }), ['S', 'S/XS', 'XS/S', 'S/M', 'M/S', 'AU8', 'AU10'])
  assert.deepEqual(wantedSizeKeys('top', [], { dress: 10 }), ['S', 'S/XS', 'XS/S', 'S/M', 'M/S', 'M', 'M/L', 'L/M', 'AU10'])
  assert.deepEqual(wantedSizeKeys('skirt', [], { letter: 'S', jeans: 26 }), ['S', 'S/XS', 'XS/S', 'S/M', 'M/S', 'AU8', 'AU10', 'W26'])
  assert.deepEqual(
    wantedSizeKeys('jeans', [], { dress: 10 }),
    ['S', 'S/XS', 'XS/S', 'S/M', 'M/S', 'M', 'M/L', 'L/M', 'AU10', 'W27', 'W28'],
    'with no waist given, the waists her AU size usually means',
  )
  assert.deepEqual(wantedSizeKeys('jeans', [], { jeans: 26 }), ['W26'])
  assert.deepEqual(wantedSizeKeys('trousers', [], { waist_cm: 68 }), ['W27'], 'a waist in centimetres, in inches')
  assert.equal(wantedSizeKeys('trousers', [], { shoe_eu: 38 }), null)
  assert.deepEqual(wantedSizeKeys('heels', [], { shoe_eu: 38, shoe_au: 7 }), ['EU38', 'US7', 'UK5'])
  assert.deepEqual(wantedSizeKeys('skirt', ['10'], { letter: 'M' }), ['AU10'], "a slot's own labels win")
  assert.equal(wantedSizeKeys('jewellery', [], { letter: 'S' }), null)
})

test('accessory and jewellery slots name their kind', () => {
  assert.equal(slotKind('jewellery', 'Gold huggie hoops'), 'earrings')
  assert.equal(slotKind('jewellery', 'Fine gold chain necklace'), 'necklace')
  assert.equal(slotKind('accessory', 'Camel wool scarf'), 'scarf')
  assert.equal(slotKind('accessory', 'Tortoiseshell claw clip'), 'hair')
  assert.equal(slotKind('belt', 'Tan leather belt with a gold buckle'), null, 'a belt is its own type')
  assert.equal(slotKind('knitwear', 'Pine fine-gauge merino cardigan'), null)
})

test('colour words, longest phrase first', () => {
  assert.deepEqual(familiesIn('Heavy Box Tee - Off White'), ['ecru'])
  assert.deepEqual(familiesIn('STRIPE SS TEE BAY BLUE/CHALK').sort(), ['blue', 'ecru'])
  assert.deepEqual(familiesIn('Coat'), [], '"oat" inside a word is not a colour')
  assert.deepEqual(familiesIn('Tank Top'), [], '"tan" inside a word is not a colour')
  assert.deepEqual(familiesIn('Stone Wash Jean'), ['blue'])
  assert.deepEqual(familiesIn('Satin Slip Dress - Butter'), ['yellow'])
  assert.deepEqual(familiesIn('Ballet Flat - Black'), ['black'], 'a ballet flat is not ballet pink')
})

test('the brand is not the colour', () => {
  assert.deepEqual(productFamilies({ title: 'Rose Midi Dress', vendor: 'Rose', colours: [], tags: [] }), [])
  assert.deepEqual(productFamilies({ title: 'Tee', vendor: null, colours: ['Pine', 'Black'], tags: [] }).sort(), ['black', 'green'])
  assert.deepEqual(productFamilies({ title: 'Tee', vendor: null, colours: [], tags: ['Colour:Silver', 'Gender:Women'] }), ['grey'])
})

test('the colour rule only says no when the words are sure', () => {
  const ecru = slotFamilies(['Ecru heavyweight cotton crew tee', 'ecru'])
  assert.deepEqual(ecru?.sort(), ['beige', 'ecru'])
  assert.ok(!colourCompatible(ecru, ['black']))
  assert.ok(colourCompatible(ecru, ['black', 'ecru']), 'one of its colours is enough')
  assert.ok(colourCompatible(ecru, []), 'no colour words: Claude decides')
  assert.ok(colourCompatible(null, ['black']), 'a slot with no colour words takes anything')
  const hoops = slotFamilies(['Gold huggie hoops', 'gold'])
  assert.ok(colourCompatible(hoops, ['yellow']), 'gold is in the slot name')
})

test('a cut the listing names about itself, against what the slot and guide allow', () => {
  assert.equal(namedCut('Heavy Box Tee 2.0 - Off White'), 'oversized')
  assert.equal(namedCut('Wide Tee Black | Boxy | Oversized'), 'oversized')
  assert.equal(namedCut('Relaxed Fit Trouser'), 'relaxed')
  assert.equal(namedCut('Boyfriend Jean'), 'relaxed')
  assert.equal(namedCut('Skinny Jean - Black'), 'slim')
  assert.equal(namedCut('Bodycon Midi Dress'), 'slim')
  assert.equal(namedCut('Balloon Sleeve Blouse'), null, 'a balloon sleeve says nothing about the body')
  assert.equal(namedCut('Balloon Leg Jean'), 'oversized')
  assert.equal(namedCut('Ecru Heavyweight Crew Tee'), null)
  assert.ok(!cutCompatible(['slim', 'regular'], 'oversized'))
  assert.ok(cutCompatible(['regular', 'relaxed'], 'relaxed'))
  assert.ok(cutCompatible(['slim'], null), 'a listing that names no cut stays for Claude')
  assert.ok(cutCompatible(null, 'oversized'), 'a slot with no fit and no guide entry takes any cut')
})

async function photo(garment: string, background = '#ffffff'): Promise<Buffer> {
  const square = await sharp({ create: { width: 120, height: 150, channels: 3, background: garment } }).png().toBuffer()
  return sharp({ create: { width: 200, height: 250, channels: 3, background } })
    .composite([{ input: square, left: 40, top: 50 }])
    .jpeg()
    .toBuffer()
}

test('a photo read finds the garment against its background', async () => {
  assert.ok((await readPhoto(await photo('#2b3a5c'))).families.includes('navy'))
  assert.deepEqual((await readPhoto(await photo('#7a1f24', '#f2f2f2'))).families, ['red'])
  assert.ok((await readPhoto(await photo('#2f4a3a'))).families.includes('green'))
  const pale = await readPhoto(await photo('#c9c9c9'))
  assert.ok(pale.families.includes('white'), 'a pale grey read may be a shaded white')
  assert.ok(!pale.families.includes('ecru'), 'but with no warmth in it, not cream')
  const cream = await readPhoto(await photo('#d8cfba'))
  assert.ok(cream.families.includes('ecru'), 'a shaded cream keeps its warmth')
  assert.equal(cream.colours.length >= 1, true, 'the read stores the colour itself, as hex')
  const lost = await readPhoto(await photo('#fbfbfb'))
  assert.deepEqual(lost.families, [], 'white on white is unsure, so the product stays')
})
