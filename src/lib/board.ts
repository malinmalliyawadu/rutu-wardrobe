import type Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { isIP } from 'node:net'
import { z } from 'zod'

import { MODELS, callUsd, claude } from './claude.ts'
import { db, type Sql } from './db.ts'
import { DisallowedError, FetchError, PoliteClient } from './finder/http.ts'
import { hexDistance } from './finder/photo-colour.ts'
import { checkUpload, MAX_UPLOAD_BYTES, normaliseImage, PhotoError, removePair, storePair, thumbName } from './photos.ts'
import { TasteSchema, type Taste } from './profile.ts'
import { finalText, plainDashes } from './structured.ts'
import { guideColours, type Guide } from './style-guide.ts'
import { files } from './storage.ts'
import { normaliseHex } from './wardrobe-values.ts'

/*
 * Her inspiration board (migration 0025): pictures of outfits she loves. A
 * pin is a picture she uploads (a screenshot, a photo) or the picture of a
 * page she pastes a link to, read from the page's og:image through the
 * finder's polite client; when a page has none she is asked for a
 * screenshot, so every pin has a picture. Pictures are stored like her other
 * photos: a metadata-free master and thumb under board/, served only through
 * /photos/board/:id.
 *
 * The photo rule (docs/plan.md 1.1): a pin's picture goes to the Claude API
 * (Sonnet) once, when it is pinned, to be read into a few words, and nowhere
 * else. The summary of the board is written from those words, not from the
 * pictures, and she chooses whether it goes into her profile's taste, which
 * the guide, the plan and the finder read.
 */

export const BOARD_DIR = 'board'

/** Sonnet, the model that reads a photo of one of her pieces. */
const BOARD_MODEL = MODELS.board

/** A read colour this close to one of hers is that colour of hers (CIE Lab distance). */
export const NEAR_PALETTE = 16

/** A pin still unread after this long was dropped (the server restarted mid-read); she can ask again. */
export const READ_GRACE_MS = 3 * 60 * 1000

/** The summary is worth writing from this many read pins. */
export const SUMMARY_MIN_PINS = 3

/** The newest pins the summary reads; older ones have said their piece. */
const SUMMARY_MAX_PINS = 80

/** A note is a line or two, not an essay. */
export const NOTE_MAX = 500

export class BoardError extends Error {}

// ---------------------------------------------------------------------------
// Claude's read of one pin
// ---------------------------------------------------------------------------

const hex = z.string().describe('Six-digit hex, "#rrggbb"')

export const PinReadSchema = z.object({
  is_outfit: z
    .boolean()
    .describe('False when the picture shows no outfit, garment, shoe, bag or jewellery to speak of (a room, a landscape, a quote).'),
  headline: z
    .string()
    .describe('What it is, under 7 words, sentence case, no brand: "Camel coat over a satin slip", "Cream linen co-ord".'),
  garments: z
    .array(z.string())
    .describe('Each garment, shoe, bag or piece of jewellery that matters to the look, a few words each, most important first: "long camel wrap coat", "pointed black slingbacks". At most 6; empty when there are none.'),
  colours: z
    .array(z.object({ hex, name: z.string().describe('As a designer would name it: "camel", "chocolate", "butter yellow"') }))
    .describe('The 2 to 5 colours that make the look, the most of the picture first.'),
  silhouette: z.string().describe('The shape in a few words: "long and lean, belted at the waist", "cropped over wide trousers".'),
  mood: z.string().describe('Two or three words: "quiet and polished", "easy weekend".'),
  occasion: z.string().describe('Where she would wear it, a few words: "the office", "dinner out", "a windy weekend walk".'),
  take: z
    .string()
    .describe('One sentence to her, under 20 words, on the idea worth borrowing: "One colour head to toe, broken by the shine of the satin."'),
})

export type PinRead = z.infer<typeof PinReadSchema>

export const PIN_READ_SYSTEM_PROMPT = `You are an experienced womenswear stylist looking through one client's inspiration board. She has pinned a picture of an outfit she loves: a screenshot from social media or a shop, a photo from a magazine or the street, sometimes a shop's product shot. Say what it is in a few plain words. A private app keeps your read, later tells her what her board has in common, and uses that when it plans her wardrobe and searches shops for her in Wellington, New Zealand.

Describe the clothes, not the person wearing them: never guess at who someone is, or at their age, body or background. Name garments the way a good shop assistant would ("long camel wrap coat", "bias-cut satin midi skirt") and colours the way a designer would, with hex values you would match fabric against, judged allowing for the light in the picture. Ignore text, logos and interface around a screenshot.

When the picture is not of clothes (a room, a landscape, a quote), set is_outfit to false and still say in a few words what it is: its colours and mood may be what she loves about it. When she has written a note, it says what drew her to it; let it steer the take.`

export function buildPinReadRequest(base64: string, context: { note: string | null; title: string | null; url: string | null }) {
  const lines: string[] = []
  if (context.note) lines.push(`Her note on it: "${context.note}"`)
  if (context.url) lines.push(`It comes from a page${context.title ? ` titled "${context.title}"` : ''} at ${hostOf(context.url) ?? context.url}.`)
  lines.push('Read the pin.')
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
    { type: 'text', text: lines.join('\n\n') },
  ]
  // Without `parse`, the SDK passes the schema through and leaves the text alone.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parse: _parse, ...format } = zodOutputFormat(PinReadSchema)
  return {
    model: BOARD_MODEL,
    max_tokens: 3000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    system: PIN_READ_SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content }],
    output_config: { effort: 'low' as const, format },
  }
}

/** The read as the app keeps it: colours tidied to hex, at most five, garments at most six. */
export function tidyRead(read: PinRead): PinRead {
  const colours = read.colours.flatMap((colour) => {
    const value = normaliseHex(colour.hex)
    return value ? [{ hex: value, name: colour.name.trim().toLowerCase() }] : []
  })
  return {
    ...read,
    headline: sentence(clean(read.headline)),
    garments: read.garments.map(clean).filter(Boolean).slice(0, 6),
    colours: colours.slice(0, 5),
    silhouette: clean(read.silhouette),
    mood: clean(read.mood),
    occasion: clean(read.occasion),
    take: clean(read.take),
  }
}

/** Words as words: no markup, no stray quote or brace a model left at the end. */
export function clean(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\s"'\u201c\u201d\u2018\u2019{}\[\]]+$/u, '')
    .replace(/^[\s"'\u201c\u201d\u2018\u2019]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

export type PinState = 'reading' | 'read' | 'failed' | 'unread'

export type Pin = {
  id: number
  kind: 'photo' | 'link'
  source_url: string | null
  title: string | null
  width: number
  height: number
  note: string | null
  read: PinRead | null
  /** Why the read failed, when it did. */
  failure: string | null
  read_at: Date | null
  usd: number | null
  created_at: Date
}

type PinRow = Omit<Pin, 'read' | 'failure'> & { read: unknown }

/** Where a pin is: being read, read, failed, or never read (the read was dropped). */
export function pinState(pin: Pick<Pin, 'read' | 'failure' | 'read_at' | 'created_at'>, now = Date.now()): PinState {
  if (pin.read) return 'read'
  if (pin.failure) return 'failed'
  if (pin.read_at === null && now - pin.created_at.getTime() < READ_GRACE_MS) return 'reading'
  return 'unread'
}

function fromRow(row: PinRow): Pin {
  const stored = (row.read ?? null) as { failure?: unknown } | null
  const parsed = stored ? PinReadSchema.safeParse(stored) : null
  const failure = stored && typeof stored.failure === 'string' ? stored.failure : null
  return { ...row, read: parsed?.success ? tidyRead(parsed.data) : null, failure }
}

const PIN_COLUMNS = (sql: Sql) => sql`
  id::int as id, kind, source_url, title, width, height, note, read, read_at, usd::float as usd, created_at
`

export async function listPins(sql: Sql = db()): Promise<Pin[]> {
  const rows = await sql<PinRow[]>`select ${PIN_COLUMNS(sql)} from board_pins order by created_at desc, id desc`
  return rows.map(fromRow)
}

export async function getPin(id: number, sql: Sql = db()): Promise<Pin | null> {
  const [row] = await sql<PinRow[]>`select ${PIN_COLUMNS(sql)} from board_pins where id = ${id}`
  return row ? fromRow(row) : null
}

export type NewPin = {
  bytes: Buffer
  note: string | null
  source_url: string | null
  title: string | null
}

/**
 * A picture onto the board. The file name is the content hash, so the same
 * screenshot pinned twice is one pin: the second time keeps the first and
 * takes the new note or link if the first had none.
 */
export async function storePin(input: NewPin, sql: Sql = db()): Promise<{ id: number; existed: boolean }> {
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) throw new PhotoError('Photos must be under 20 MB.')
  const { master, thumb, sha256 } = await normaliseImage(input.bytes)
  const relative = `${BOARD_DIR}/${sha256.slice(0, 24)}.jpg`
  await storePair(relative, master.data, thumb)
  const note = input.note ? input.note.slice(0, NOTE_MAX) : null
  const [row] = await sql<{ id: number; existed: boolean }[]>`
    insert into board_pins (kind, source_url, title, path, sha256, bytes, width, height, note)
    values (${input.source_url ? 'link' : 'photo'}, ${input.source_url}, ${input.title}, ${relative}, ${sha256},
            ${master.info.size}, ${master.info.width}, ${master.info.height}, ${note})
    on conflict (path) do update
      set note = coalesce(board_pins.note, excluded.note),
          kind = case when board_pins.source_url is null and excluded.source_url is not null then 'link' else board_pins.kind end,
          source_url = coalesce(board_pins.source_url, excluded.source_url),
          title = coalesce(board_pins.title, excluded.title)
    returning id::int as id, (xmax <> 0) as existed
  `
  if (!row) throw new Error('pin insert returned nothing')
  return row
}

/** An upload from her phone: the usual type and size rules, then onto the board. */
export async function pinUpload(
  upload: { bytes: Buffer; mime: string },
  extra: { note: string | null; source_url?: string | null; title?: string | null },
  sql: Sql = db(),
): Promise<{ id: number; existed: boolean }> {
  checkUpload(upload)
  return storePin({ bytes: upload.bytes, note: extra.note, source_url: extra.source_url ?? null, title: extra.title ?? null }, sql)
}

/**
 * A link onto the board: the page read once, politely (robots.txt, a named
 * User-Agent), for its og:image, which is then fetched the same way. When
 * the page will not be read or has no picture, she is asked for a screenshot.
 */
export async function pinLink(url: URL, note: string | null, client = new PoliteClient(), sql: Sql = db()): Promise<{ id: number; existed: boolean }> {
  let page: { image: string | null; title: string | null }
  try {
    page = pageMeta(await client.text(url.toString()), url)
  } catch (error) {
    throw linkError(error)
  }
  const image = page.image ? safeUrl(page.image) : null
  if (!image) throw new BoardError('That page has no picture to pin. Add a screenshot of it with the link.')
  let bytes: Buffer
  try {
    bytes = await client.bytes(image.toString())
  } catch (error) {
    throw linkError(error)
  }
  try {
    return await storePin({ bytes, note, source_url: url.toString(), title: page.title }, sql)
  } catch (error) {
    if (error instanceof PhotoError) throw new BoardError('The picture on that page could not be read. Add a screenshot of it with the link.')
    throw error
  }
}

function linkError(error: unknown): Error {
  if (error instanceof DisallowedError) {
    return new BoardError('That site asks apps not to read its pages. Add a screenshot of it with the link.')
  }
  if (error instanceof FetchError) return new BoardError('That page could not be read. Add a screenshot of it with the link.')
  return error as Error
}

export async function updateNote(id: number, note: string | null, sql: Sql = db()): Promise<void> {
  await sql`update board_pins set note = ${note ? note.slice(0, NOTE_MAX) : null} where id = ${id}`
}

export async function removePin(id: number, sql: Sql = db()): Promise<boolean> {
  const [row] = await sql<{ path: string }[]>`delete from board_pins where id = ${id} returning path`
  if (!row) return false
  await removePair(row.path)
  return true
}

export async function pinFile(id: number, variant: 'master' | 'thumb', sql: Sql = db()): Promise<Buffer | null> {
  const [row] = await sql<{ path: string }[]>`select path from board_pins where id = ${id}`
  if (!row) return null
  return files().get(variant === 'thumb' ? thumbName(row.path) : row.path)
}

/**
 * One Sonnet call, once per pin. The read (or why it failed) and its cost
 * are kept on the row; the app never reads the same picture twice unless she
 * asks after a failure.
 */
export async function readPin(id: number, sql: Sql = db()): Promise<PinRead | null> {
  const [row] = await sql<{ path: string; note: string | null; title: string | null; source_url: string | null }[]>`
    select path, note, title, source_url from board_pins where id = ${id}
  `
  if (!row) return null
  const bytes = await files().get(row.path)
  if (!bytes) {
    await sql`update board_pins set read = ${sql.json({ failure: 'The picture is missing its file.' })}, read_at = now() where id = ${id}`
    return null
  }
  let read: PinRead | null = null
  let failure: string | null = null
  let usd = 0
  let meta: Record<string, unknown> = { model: BOARD_MODEL }
  try {
    const response = await claude().beta.messages.create(
      buildPinReadRequest(bytes.toString('base64'), { note: row.note, title: row.title, url: row.source_url }),
      { maxRetries: 3 },
    )
    usd = callUsd(BOARD_MODEL, response.usage)
    meta = {
      model: BOARD_MODEL,
      served_by: response.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    }
    if (response.stop_reason === 'refusal') failure = 'Claude declined to read this picture.'
    else if (response.stop_reason === 'max_tokens') failure = 'The read was cut off.'
    else {
      const parsed = PinReadSchema.safeParse(plainDashes(parseJson(finalText(response.content))))
      if (parsed.success) read = tidyRead(parsed.data)
      else failure = 'Claude answered in a shape the app did not expect.'
    }
  } catch (error) {
    failure = 'Claude could not be reached.'
    meta = { ...meta, error: (error as Error).message }
  }
  await sql`
    update board_pins set read = ${sql.json({ ...(read ?? { failure }), meta })}, read_at = now(), usd = coalesce(usd, 0) + ${usd}
    where id = ${id}
  `
  return read
}

/** A pin's colours, each marked when it is one of hers (or close enough to be). */
export function pinColours(
  read: Pick<PinRead, 'colours'>,
  guide: Pick<Guide, 'palette'> | null,
): { hex: string; name: string; yours: string | null }[] {
  const palette = guide ? guideColours(guide) : []
  return read.colours.map((colour) => {
    let nearest: { name: string; distance: number } | null = null
    for (const own of palette) {
      const distance = hexDistance(colour.hex, own.hex)
      if (!nearest || distance < nearest.distance) nearest = { name: own.name, distance }
    }
    return { ...colour, yours: nearest && nearest.distance <= NEAR_PALETTE ? nearest.name : null }
  })
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** A pasted link as a URL, or null when it is not a page on the open web. */
export function parsePinUrl(raw: string | null): URL | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`)
}

/**
 * http or https on a public host. The app fetches what she pastes and what a
 * page names as its picture, so a page cannot point it at the server itself
 * or the private network it sits on.
 */
export function safeUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host.includes('.') && isIP(host) === 0) return null
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null
  if (isIP(host) && privateAddress(host)) return null
  return url
}

function privateAddress(host: string): boolean {
  if (isIP(host) === 6) {
    const lower = host.toLowerCase()
    if (lower.startsWith('::ffff:')) return privateAddress(lower.slice(7))
    return lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')
  }
  const [a = 0, b = 0] = host.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * The picture and title a page offers when it is shared: og:image (or
 * og:image:secure_url, twitter:image, link rel=image_src), og:title or the
 * page's <title>. Relative URLs resolve against the page.
 */
export function pageMeta(html: string, page: URL): { image: string | null; title: string | null } {
  const head = html.slice(0, 400_000)
  const metas = new Map<string, string>()
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? '').toLowerCase()
    const content = attrs.content
    if (key && content && !metas.has(key)) metas.set(key, content)
  }
  let imageSrc: string | null = null
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    if ((attrs.rel ?? '').toLowerCase().split(/\s+/).includes('image_src') && attrs.href) {
      imageSrc = attrs.href
      break
    }
  }
  const rawImage =
    metas.get('og:image:secure_url') ?? metas.get('og:image') ?? metas.get('og:image:url') ?? metas.get('twitter:image') ?? metas.get('twitter:image:src') ?? metas.get('image') ?? imageSrc
  let image: string | null = null
  if (rawImage) {
    try {
      image = new URL(decodeEntities(rawImage.trim()), page).toString()
    } catch {
      image = null
    }
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]
  const rawTitle = metas.get('og:title') ?? metas.get('twitter:title') ?? titleTag ?? null
  const title = rawTitle ? decodeEntities(rawTitle).replace(/\s+/g, ' ').trim().slice(0, 200) || null : null
  return { image, title }
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const match of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    const name = match[1]!.toLowerCase()
    if (!(name in out)) out[name] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return out
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

// ---------------------------------------------------------------------------
// What the board says
// ---------------------------------------------------------------------------

export const BoardSummarySchema = z.object({
  summary: z
    .string()
    .describe('Two or three sentences to her, second person, under 60 words: what her board says about her taste, specifically.'),
  threads: z
    .array(z.string())
    .describe('The 3 to 5 threads that run through the board, each under 8 words, strongest first: "long, lean columns in one colour".'),
  references: z
    .string()
    .describe('The same taste as she would type it into her profile: noun phrases separated by semicolons, under 400 characters. "long lean columns in one colour; camel, chocolate and cream with one rust accent; slip skirts under chunky knits".'),
  no_gos: z
    .string()
    .nullable()
    .describe('Only what the board clearly steers away from, in the same style, under 200 characters. Null when it says nothing about what she avoids; never guess dislikes from what is missing.'),
})

export type BoardSummary = z.infer<typeof BoardSummarySchema>

export const SUMMARY_SYSTEM_PROMPT = `You are an experienced womenswear stylist. Below are the pins on one client's inspiration board, each as you read it when she pinned it, with her own note where she wrote one, newest first. Tell her what her board says about her taste: the threads that run through it (colours, shapes, cloth, details, mood, where she would wear it), plainly and specifically, as you would across a table. Name what recurs, not what appears once. A thread three pins share matters more than a striking one-off.

Her profile's taste feeds the app that drafts her style guide, plans her wardrobe and searches shops for her, so also write the same taste the way she would type it there. Where her palette is given and her pins lean toward or away from it, you may say so in one clause; do not lecture.`

export type SummaryPin = Pick<Pin, 'id' | 'note' | 'read'>

export function buildSummaryRequest(pins: SummaryPin[], guide: Pick<Guide, 'palette'> | null) {
  const board = pins.flatMap((pin) =>
    pin.read
      ? [
          {
            what: pin.read.headline,
            garments: pin.read.garments,
            colours: pin.read.colours.map((colour) => colour.name),
            silhouette: pin.read.silhouette,
            mood: pin.read.mood,
            occasion: pin.read.occasion,
            ...(pin.read.is_outfit ? {} : { not_clothes: true }),
            ...(pin.note ? { her_note: pin.note } : {}),
          },
        ]
      : [],
  )
  const palette = guide
    ? `\n\nHer palette's best colours: ${guide.palette.best.map((colour) => colour.name).join(', ')}. Neutrals: ${guide.palette.neutrals.map((colour) => colour.name).join(', ')}.`
    : ''
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parse: _parse, ...format } = zodOutputFormat(BoardSummarySchema)
  return {
    model: BOARD_MODEL,
    max_tokens: 3000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user' as const,
        content: `Her board, ${board.length} pins:\n${JSON.stringify(board, null, 1)}${palette}\n\nWhat does her board say?`,
      },
    ],
    output_config: { effort: 'medium' as const, format },
  }
}

export type StoredSummary = BoardSummary & {
  id: number
  pin_ids: number[]
  usd: number | null
  created_at: Date
  applied_at: Date | null
}

export async function latestSummary(sql: Sql = db()): Promise<StoredSummary | null> {
  const [row] = await sql<{ id: number; summary: unknown; pin_ids: number[]; usd: number | null; created_at: Date; applied_at: Date | null }[]>`
    select id::int as id, summary, pin_ids::int[] as pin_ids, usd::float as usd, created_at, applied_at
    from board_summaries order by created_at desc, id desc limit 1
  `
  if (!row) return null
  const parsed = BoardSummarySchema.safeParse(row.summary)
  if (!parsed.success) return null
  return { ...parsed.data, id: row.id, pin_ids: row.pin_ids, usd: row.usd, created_at: row.created_at, applied_at: row.applied_at }
}

/** How far the board has moved on since the summary: pins added since, and pins it read that are gone. */
export function summaryDrift(summary: Pick<StoredSummary, 'pin_ids'>, pins: Pick<Pin, 'id' | 'read'>[]): { added: number; removed: number } {
  const read = new Set(summary.pin_ids)
  const now = new Set(pins.filter((pin) => pin.read).map((pin) => pin.id))
  return {
    added: [...now].filter((id) => !read.has(id)).length,
    removed: [...read].filter((id) => !now.has(id)).length,
  }
}

/** One Sonnet call over the pins' words (never the pictures). */
export async function summariseBoard(guide: Pick<Guide, 'palette'> | null, sql: Sql = db()): Promise<StoredSummary> {
  const pins = (await listPins(sql)).filter((pin) => pin.read).slice(0, SUMMARY_MAX_PINS)
  if (pins.length < SUMMARY_MIN_PINS) {
    throw new BoardError(`Pin at least ${SUMMARY_MIN_PINS} outfits first, so there is something they share.`)
  }
  let response: Anthropic.Beta.BetaMessage
  try {
    response = await claude().beta.messages.create(buildSummaryRequest(pins, guide), { maxRetries: 3 })
  } catch {
    throw new BoardError('Claude could not be reached. Try again in a minute.')
  }
  const usd = callUsd(BOARD_MODEL, response.usage)
  if (response.stop_reason === 'refusal') throw new BoardError('Claude declined to read the board.')
  if (response.stop_reason === 'max_tokens') throw new BoardError('The summary was cut off. Try again.')
  const parsed = BoardSummarySchema.safeParse(plainDashes(parseJson(finalText(response.content))))
  if (!parsed.success) throw new BoardError('Claude answered in a shape the app did not expect. Try again.')
  const summary = { ...parsed.data, threads: parsed.data.threads.map((thread) => thread.trim()).filter(Boolean).slice(0, 5) }
  const [row] = await sql<{ id: number; created_at: Date }[]>`
    insert into board_summaries (summary, pin_ids, model, usd)
    values (${sql.json(summary)}, ${pins.map((pin) => pin.id)}::bigint[], ${response.model}, ${usd})
    returning id::int as id, created_at
  `
  if (!row) throw new Error('summary insert returned nothing')
  return { ...summary, id: row.id, pin_ids: pins.map((pin) => pin.id), usd, created_at: row.created_at, applied_at: null }
}

/** What the board has cost: every read and every summary. */
export async function boardUsd(sql: Sql = db()): Promise<number> {
  const [row] = await sql<{ usd: number }[]>`
    select (coalesce((select sum(usd) from board_pins), 0) + coalesce((select sum(usd) from board_summaries), 0))::float as usd
  `
  return row?.usd ?? 0
}

// ---------------------------------------------------------------------------
// Into her taste
// ---------------------------------------------------------------------------

/** The line the board writes in her taste; anything else there is hers and stays. */
export const BOARD_LINE = 'From my board:'

/**
 * Her taste with the board's summary in it. Her own words stay as they are;
 * the board's line replaces the board's previous line, so applying again
 * never piles up. Each field keeps to the profile's length limit by
 * shortening the board's part, never hers.
 */
export function mergeTaste(taste: Partial<Taste>, summary: Pick<BoardSummary, 'references' | 'no_gos'>): Taste {
  const limits = TasteSchema.shape
  const references = withBoardLine(taste.references ?? null, summary.references, limits.references.unwrap().maxLength ?? 2000)
  const noGos = summary.no_gos
    ? withBoardLine(taste.no_gos ?? null, summary.no_gos, limits.no_gos.unwrap().maxLength ?? 2000)
    : withoutBoardLine(taste.no_gos ?? null)
  return { references, no_gos: noGos, owned: taste.owned ?? null }
}

function withoutBoardLine(text: string | null): string | null {
  if (!text) return null
  const kept = text
    .split('\n')
    .filter((line) => !line.trim().startsWith(BOARD_LINE))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return kept || null
}

function withBoardLine(text: string | null, board: string, max: number): string | null {
  const own = withoutBoardLine(text)
  const words = board.replace(/\s+/g, ' ').trim()
  if (!words) return own
  const prefix = own ? `${own}\n\n` : ''
  const room = max - prefix.length - BOARD_LINE.length - 1
  if (room < 20) return own
  const line = `${BOARD_LINE} ${words.length > room ? `${words.slice(0, room - 1).replace(/[;,\s]+\S*$/, '')}.` : words}`
  return `${prefix}${line}`
}

/** The summary into her profile's taste; the guide, the plan and the finder read it from there. */
export async function markApplied(id: number, sql: Sql = db()): Promise<void> {
  await sql`update board_summaries set applied_at = now() where id = ${id}`
}

// ---------------------------------------------------------------------------

function sentence(value: string): string {
  const trimmed = value.trim().replace(/\.$/, '')
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
