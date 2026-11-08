import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'

import sharp from 'sharp'

import {
  BOARD_LINE,
  BoardError,
  buildPinReadRequest,
  buildSummaryRequest,
  getPin,
  listPins,
  mergeTaste,
  pageMeta,
  parsePinUrl,
  pinColours,
  pinFile,
  pinLink,
  pinState,
  pinUpload,
  READ_GRACE_MS,
  removePin,
  safeUrl,
  summaryDrift,
  tidyRead,
  updateNote,
  type PinRead,
} from '../src/lib/board.ts'
import { connect, db, type Sql } from '../src/lib/db.ts'
import { PoliteClient } from '../src/lib/finder/http.ts'

import { guideFixture } from './fixtures.ts'

/*
 * The inspiration board: the pure parts (a page's picture, links, the read's
 * tidying, merging the summary into her taste), then pins against a real
 * Postgres in a scratch database (never the one DATABASE_URL names) and a
 * throwaway PHOTOS_DIR. Claude is never called.
 */

const read = (overrides: Partial<PinRead> = {}): PinRead => ({
  is_outfit: true,
  headline: 'Camel coat over a satin slip',
  garments: ['long camel wrap coat', 'champagne satin slip skirt'],
  colours: [
    { hex: '#C19A6B', name: 'Camel' },
    { hex: '#7a2e1f', name: 'oxblood' },
  ],
  silhouette: 'long and lean',
  mood: 'quiet and polished',
  occasion: 'dinner out',
  take: 'One colour head to toe.',
  ...overrides,
})

describe('a page and its picture', () => {
  const page = new URL('https://shop.example.com/products/coat?colour=camel')

  test('og:image wins, relative URLs resolve against the page, entities decode', () => {
    const html = `<html><head>
      <title>Coat | Shop</title>
      <meta content="/images/coat.jpg?w=1200&amp;h=1600" property="og:image">
      <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
      <meta property="og:title" content="Camel wrap coat &#8211; Shop">
    </head><body></body></html>`
    assert.deepEqual(pageMeta(html, page), {
      image: 'https://shop.example.com/images/coat.jpg?w=1200&h=1600',
      title: 'Camel wrap coat \u2013 Shop',
    })
  })

  test('falls back to twitter:image, then link rel=image_src, then the title tag', () => {
    assert.equal(pageMeta(`<meta name='twitter:image' content='//cdn.example.com/a.jpg'>`, page).image, 'https://cdn.example.com/a.jpg')
    const linkOnly = pageMeta('<head><title> A  look </title><link rel="image_src" href="look.png"></head>', page)
    assert.deepEqual(linkOnly, { image: 'https://shop.example.com/products/look.png', title: 'A look' })
    assert.deepEqual(pageMeta('<p>No head at all</p>', page), { image: null, title: null })
  })

  test('a pasted link is a public web page or nothing', () => {
    assert.equal(parsePinUrl(' www.example.com/look ')?.toString(), 'https://www.example.com/look')
    assert.equal(parsePinUrl('http://example.com/a')?.protocol, 'http:')
    assert.equal(parsePinUrl(''), null)
    assert.equal(parsePinUrl('javascript:alert(1)'), null)
    assert.equal(parsePinUrl('file:///etc/passwd'), null)
    assert.equal(parsePinUrl('http://localhost:3000/'), null)
    assert.equal(parsePinUrl('http://intranet/'), null)
    assert.equal(safeUrl('http://192.168.1.10/photo.jpg'), null)
    assert.equal(safeUrl('http://10.0.0.2/'), null)
    assert.equal(safeUrl('http://169.254.169.254/latest/meta-data'), null)
    assert.equal(safeUrl('http://[::1]/'), null)
    assert.equal(safeUrl('http://user:pass@example.com/'), null)
    assert.ok(safeUrl('https://8.8.8.8/'))
  })
})

describe("Claude's read", () => {
  test('the request sends the picture, her note and where it came from, to Sonnet at low effort', () => {
    const request = buildPinReadRequest('AAAA', { note: 'the colour', title: 'Spring edit', url: 'https://www.example.com/a' })
    assert.match(request.model, /sonnet/)
    assert.equal(request.output_config.effort, 'low')
    const [image, words] = request.messages[0]!.content as { type: string; text?: string }[]
    assert.equal(image!.type, 'image')
    assert.match(words!.text ?? '', /Her note on it: "the colour"/)
    assert.match(words!.text ?? '', /titled "Spring edit" at example\.com/)
    const bare = buildPinReadRequest('AAAA', { note: null, title: null, url: null }).messages[0]!.content as { text?: string }[]
    assert.equal(bare[1]!.text, 'Read the pin.')
  })

  test('the read is tidied: hex normalised, bad colours dropped, at most five colours and six garments', () => {
    const tidy = tidyRead(
      read({
        headline: 'camel coat.',
        colours: [...Array.from({ length: 6 }, () => ({ hex: '#ABC', name: ' Stone ' })), { hex: 'beige', name: 'beige' }],
        garments: ['a', ' ', 'b', 'c', 'd', 'e', 'f', 'g'],
        take: 'Length alone can carry a look.\u201d}</br>',
        mood: ' "sober <b>and</b> heritage" ',
      }),
    )
    assert.equal(tidy.take, 'Length alone can carry a look.')
    assert.equal(tidy.mood, 'sober and heritage')
    assert.equal(tidy.headline, 'Camel coat')
    assert.equal(tidy.colours.length, 5)
    assert.deepEqual(tidy.colours[0], { hex: '#aabbcc', name: 'stone' })
    assert.deepEqual(tidy.garments, ['a', 'b', 'c', 'd', 'e', 'f'])
  })

  test('a colour close to one of hers is named as hers', () => {
    const colours = pinColours({ colours: [{ hex: '#7d301f', name: 'rust red' }, { hex: '#1f4fd1', name: 'cobalt' }] }, guideFixture)
    assert.equal(colours[0]!.yours, 'oxblood')
    assert.equal(colours[1]!.yours, null)
    assert.equal(pinColours({ colours: [{ hex: '#7a2e1f', name: 'x' }] }, null)[0]!.yours, null)
  })

  test('a pin is being read for a few minutes, then it was dropped', () => {
    const now = Date.now()
    const fresh = { read: null, failure: null, read_at: null, created_at: new Date(now - 1000) }
    assert.equal(pinState(fresh, now), 'reading')
    assert.equal(pinState({ ...fresh, created_at: new Date(now - READ_GRACE_MS - 1) }, now), 'unread')
    assert.equal(pinState({ ...fresh, failure: 'Cut off.', read_at: new Date(now) }, now), 'failed')
    assert.equal(pinState({ ...fresh, read: read(), read_at: new Date(now) }, now), 'read')
  })
})

describe('what the board says', () => {
  test('the summary reads words only: each read, her notes, and her palette names', () => {
    const request = buildSummaryRequest(
      [
        { id: 1, note: 'love the length', read: read() },
        { id: 2, note: null, read: null },
        { id: 3, note: null, read: read({ is_outfit: false, headline: 'A stone beach' }) },
      ],
      guideFixture,
    )
    const content = request.messages[0]!.content
    assert.match(content, /Her board, 2 pins/)
    assert.match(content, /"her_note": "love the length"/)
    assert.match(content, /"not_clothes": true/)
    assert.match(content, /best colours: oxblood, pine/)
    assert.doesNotMatch(content, /#c19a6b/i, 'colours go by name')
  })

  test('drift counts pins read since and pins it read that are gone', () => {
    const pins = [
      { id: 1, read: read() },
      { id: 2, read: read() },
      { id: 4, read: null },
    ]
    assert.deepEqual(summaryDrift({ pin_ids: [1, 3] }, pins), { added: 1, removed: 1 })
  })

  test('merging into her taste keeps her words and replaces only the board line', () => {
    const once = mergeTaste({ references: 'Phoebe Philo era Celine.', no_gos: 'Logos.', owned: 'A trench.' }, { references: 'long lean columns; camel and cream', no_gos: null })
    assert.equal(once.references, `Phoebe Philo era Celine.\n\n${BOARD_LINE} long lean columns; camel and cream`)
    assert.equal(once.no_gos, 'Logos.')
    assert.equal(once.owned, 'A trench.')
    const twice = mergeTaste(once, { references: 'slip skirts under knits', no_gos: 'bodycon' })
    assert.equal(twice.references, `Phoebe Philo era Celine.\n\n${BOARD_LINE} slip skirts under knits`)
    assert.equal(twice.no_gos, `Logos.\n\n${BOARD_LINE} bodycon`)
    const cleared = mergeTaste(twice, { references: 'slip skirts under knits', no_gos: null })
    assert.equal(cleared.no_gos, 'Logos.', 'a board with nothing to avoid takes its old line out')
    assert.deepEqual(mergeTaste({}, { references: 'cream', no_gos: null }), { references: `${BOARD_LINE} cream`, no_gos: null, owned: null })
  })

  test('the board line is shortened to fit the profile limit, never her words', () => {
    const own = 'x'.repeat(3900)
    const merged = mergeTaste({ references: own }, { references: 'long lean columns; '.repeat(40), no_gos: null })
    assert.ok(merged.references!.length <= 4000)
    assert.ok(merged.references!.startsWith(own))
    assert.match(merged.references!, /From my board: long lean columns.*\.$/)
    const full = mergeTaste({ references: 'y'.repeat(3990) }, { references: 'cream', no_gos: null })
    assert.equal(full.references, 'y'.repeat(3990), 'no room, no line')
  })
})

describe('pins in the database', () => {
  const scratch = `wardrobe_board_${process.pid}_${Date.now()}`
  let admin: Sql
  let sql: Sql
  let dir: string

  before(async () => {
    assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be set for the board test')
    admin = connect({ max: 1 })
    await admin.unsafe(`create database ${scratch}`)
    const url = new URL(process.env.DATABASE_URL)
    url.pathname = `/${scratch}`
    execFileSync(process.execPath, ['scripts/migrate.ts'], { env: { ...process.env, DATABASE_URL: url.toString() } })
    process.env.DATABASE_URL = url.toString()
    sql = connect({ max: 2 })
    dir = await mkdtemp(path.join(tmpdir(), 'wardrobe-board-'))
    process.env.PHOTOS_DIR = dir
  })

  after(async () => {
    await sql?.end()
    await db().end()
    await admin.unsafe(`drop database if exists ${scratch} with (force)`)
    await admin.end()
    await rm(dir, { recursive: true, force: true })
  })

  const picture = (colour: string) =>
    sharp({ create: { width: 900, height: 1200, channels: 3, background: colour } }).png().toBuffer()

  test('an upload is a pin with a stored master and thumb; the same picture again is the same pin', async () => {
    const bytes = await picture('#c19a6b')
    const first = await pinUpload({ bytes, mime: 'image/png' }, { note: null }, sql)
    assert.equal(first.existed, false)
    const again = await pinUpload({ bytes, mime: 'image/png' }, { note: 'the coat', source_url: 'https://example.com/a', title: 'A' }, sql)
    assert.deepEqual(again, { id: first.id, existed: true })

    const pin = await getPin(first.id, sql)
    assert.equal(pin?.kind, 'link', 'a link added later makes it a link pin')
    assert.equal(pin?.note, 'the coat')
    assert.equal(pin?.width, 900)
    assert.equal(pin?.read, null)
    assert.ok((await pinFile(first.id, 'master', sql))?.byteLength)
    assert.ok((await pinFile(first.id, 'thumb', sql))?.byteLength)

    await updateNote(first.id, 'the length', sql)
    assert.equal((await getPin(first.id, sql))?.note, 'the length')
  })

  test('a link is pinned from its og:image, read politely; a page with none asks for a screenshot', async () => {
    const image = await picture('#2f4a3a')
    const fetched: string[] = []
    const fake: typeof fetch = async (input) => {
      const url = String(input)
      fetched.push(url)
      if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /\n')
      if (url === 'https://shop.example.com/look') {
        return new Response('<meta property="og:image" content="/look.jpg"><title>Pine look</title>', { headers: { 'content-type': 'text/html' } })
      }
      if (url === 'https://shop.example.com/look.jpg') return new Response(new Uint8Array(image))
      if (url === 'https://shop.example.com/bare') return new Response('<p>nothing</p>')
      return new Response('missing', { status: 404 })
    }
    const client = new PoliteClient({ fetch: fake, sleep: async () => {} })
    const { id } = await pinLink(new URL('https://shop.example.com/look'), 'pine', client, sql)
    const pin = await getPin(id, sql)
    assert.equal(pin?.kind, 'link')
    assert.equal(pin?.title, 'Pine look')
    assert.equal(pin?.source_url, 'https://shop.example.com/look')
    assert.ok(fetched.includes('https://shop.example.com/robots.txt'), 'robots.txt read first')

    await assert.rejects(pinLink(new URL('https://shop.example.com/bare'), null, client, sql), BoardError)
    await assert.rejects(pinLink(new URL('https://shop.example.com/gone'), null, client, sql), BoardError)
  })

  test('a site that disallows apps is not read', async () => {
    const fake: typeof fetch = async (input) =>
      String(input).endsWith('/robots.txt') ? new Response('User-agent: *\nDisallow: /\n') : new Response('<meta property="og:image" content="/x.jpg">')
    const client = new PoliteClient({ fetch: fake, sleep: async () => {} })
    await assert.rejects(pinLink(new URL('https://private.example.com/a'), null, client, sql), /asks apps not to read/)
  })

  test('pins list newest first, and removing one takes its files', async () => {
    const pins = await listPins(sql)
    assert.ok(pins.length >= 2)
    assert.ok(pins[0]!.created_at >= pins[1]!.created_at)
    const target = pins[0]!.id
    assert.equal(await removePin(target, sql), true)
    assert.equal(await getPin(target, sql), null)
    assert.equal(await pinFile(target, 'master', sql), null)
    assert.equal(await removePin(target, sql), false)
  })

  test('a file that is not a picture is turned away in words', async () => {
    await assert.rejects(pinUpload({ bytes: Buffer.from('hello'), mime: 'text/plain' }, { note: null }, sql), /JPEG, PNG/)
    await assert.rejects(pinUpload({ bytes: Buffer.from('hello'), mime: 'image/png' }, { note: null }, sql), /could not be read/)
  })
})
