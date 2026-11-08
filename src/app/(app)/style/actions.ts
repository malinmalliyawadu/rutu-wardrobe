'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { echo, type ActionState } from '@/lib/action-state'
import {
  BoardError,
  NOTE_MAX,
  latestSummary,
  markApplied,
  mergeTaste,
  parsePinUrl,
  pinLink,
  pinUpload,
  readPin,
  removePin as deletePin,
  summariseBoard,
  updateNote,
} from '@/lib/board'
import { text } from '@/lib/form-parse'
import { PhotoError } from '@/lib/photos'
import { getProfile, saveTaste } from '@/lib/profile'
import { getGuide } from '@/lib/style-guide'

/*
 * The board's actions. Pinning stores the picture and answers at once; the
 * read happens after the response (after()), and the board refreshes itself
 * while a pin is being read. Every change refreshes the tree, since her taste
 * feeds the guide, the plan and the finder.
 */

/** At most this many pictures in one go. */
const MAX_FILES = 12

export type PinResult = (NonNullable<ActionState> & { pinned?: number[] }) | null

function refreshAll(): void {
  revalidatePath('/', 'layout')
}

function id(form: FormData): number | null {
  const value = Number(form.get('id'))
  return Number.isInteger(value) && value > 0 ? value : null
}

function note(form: FormData): string | null {
  const value = text(form, 'note')
  return value ? value.slice(0, NOTE_MAX) : null
}

function readLater(ids: number[]): void {
  if (ids.length === 0) return
  after(async () => {
    // One at a time: a handful of pins is a few seconds each.
    for (const pinId of ids) {
      try {
        await readPin(pinId)
      } catch (error) {
        console.error(JSON.stringify({ event: 'board.read_failed', pin: pinId, message: (error as Error).message }))
      }
    }
  })
}

/**
 * Pictures, a link, or both, with an optional note. A link with pictures is
 * pinned as the first picture, with the link kept on it; a link alone is
 * pinned from the page's own picture, or she is asked for a screenshot.
 */
export async function addPins(_prev: PinResult, form: FormData): Promise<PinResult> {
  const uploads = form.getAll('file').filter((value): value is File => value instanceof File && value.size > 0)
  const rawUrl = text(form, 'url')
  const url = parsePinUrl(rawUrl)
  const words = note(form)

  if (rawUrl && !url) {
    return { ok: false, errors: { url: 'That does not look like a link to a page. Copy it again from the address bar.' }, values: echo(form) }
  }
  if (uploads.length === 0 && !url) return { ok: false, message: 'Add a picture or paste a link first.', values: echo(form) }
  if (uploads.length > MAX_FILES) return { ok: false, message: `Pin up to ${MAX_FILES} pictures at a time.`, values: echo(form) }

  const pinned: number[] = []
  const toRead: number[] = []
  const problems: string[] = []
  let fromUploads = 0

  if (uploads.length === 0 && url) {
    try {
      const pin = await pinLink(url, words)
      pinned.push(pin.id)
      if (!pin.existed) toRead.push(pin.id)
    } catch (error) {
      if (error instanceof BoardError) return { ok: false, message: error.message, errors: { file: 'needed' }, values: echo(form) }
      throw error
    }
  }

  for (const [index, upload] of uploads.entries()) {
    try {
      const pin = await pinUpload(
        { bytes: Buffer.from(await upload.arrayBuffer()), mime: upload.type },
        { note: words, source_url: index === 0 && url ? url.toString() : null },
      )
      pinned.push(pin.id)
      fromUploads += 1
      if (!pin.existed) toRead.push(pin.id)
    } catch (error) {
      if (error instanceof PhotoError) problems.push(error.message)
      else throw error
    }
  }

  readLater(toRead)
  refreshAll()
  if (pinned.length === 0) return { ok: false, message: problems[0] ?? 'Nothing could be pinned.', values: echo(form) }
  const skipped = uploads.length - fromUploads
  return {
    ok: true,
    pinned,
    message: skipped > 0 ? `${skipped === 1 ? 'One picture' : `${skipped} pictures`} could not be pinned. ${problems[0] ?? ''}`.trim() : undefined,
  }
}

export async function removePin(form: FormData): Promise<void> {
  const pinId = id(form)
  if (pinId) await deletePin(pinId)
  refreshAll()
}

/** After a failed or dropped read, on her tap. */
export async function readAgain(form: FormData): Promise<void> {
  const pinId = id(form)
  if (!pinId) return
  await readPin(pinId)
  refreshAll()
}

export async function saveNote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const pinId = id(form)
  if (!pinId) return { ok: false, message: 'That pin is gone.' }
  await updateNote(pinId, note(form))
  refreshAll()
  return { ok: true }
}

export async function summarise(): Promise<ActionState> {
  try {
    await summariseBoard(await getGuide())
  } catch (error) {
    if (error instanceof BoardError) return { ok: false, message: error.message }
    throw error
  }
  refreshAll()
  return { ok: true }
}

/** The summary into her taste on Me; the guide, the plan and the finder read it from there. */
export async function applyToTaste(_prev: ActionState, form: FormData): Promise<ActionState> {
  const summaryId = id(form)
  const [summary, profile] = await Promise.all([latestSummary(), getProfile()])
  if (!summary || summary.id !== summaryId) return { ok: false, message: 'The board has a newer summary. Look again.' }
  await saveTaste(mergeTaste(profile.taste, summary))
  await markApplied(summary.id)
  refreshAll()
  return { ok: true }
}
