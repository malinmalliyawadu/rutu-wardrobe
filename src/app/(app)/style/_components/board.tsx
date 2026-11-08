'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent,
  type FormEvent,
} from 'react'

import { Spinner, SubmitButton } from '@/components/ui/form'
import { HoldButton } from '@/components/ui/hold-button'
import { BackIcon, CloseIcon, OutIcon, PlusIcon } from '@/components/ui/icons'
import { Swatch } from '@/components/ui/swatch'
import type { PinRead, PinState } from '@/lib/board'

import { addPins, readAgain, removePin, saveNote, type PinResult } from '../actions'
import { BoardNote, type NoteView } from './board-note'
import { sentence } from './format'

/*
 * Her inspiration board: "Pin it" at the top, then her pins as a mood board
 * in CSS columns, newest first, each picture whole in a rounded tile with
 * Claude's few words under it. A tap opens the pin in a viewer with the read,
 * her note and a hold-to-remove; arrows step through the board. A note from
 * the stylist (what the board says) sits among the pins as the first card,
 * across the top on the phone.
 */

export type PinView = {
  id: number
  url: string | null
  host: string | null
  title: string | null
  width: number
  height: number
  note: string | null
  read: Omit<PinRead, 'colours'> | null
  colours: { hex: string; name: string; yours: string | null }[]
  state: PinState
  failure: string | null
  /** "under US$0.01", or null before the read. */
  cost: string | null
  /** "8 November". */
  pinned: string
}

/** A tile's picture keeps its shape, within reason: a full phone screenshot is cropped, not a column of its own. */
const TALLEST = 1.6
const WIDEST = 0.62

export function Board({ pins, note }: { pins: PinView[]; note: NoteView }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [fresh, setFresh] = useState<number[]>([])
  const index = pins.findIndex((pin) => pin.id === openId)
  const open = index >= 0 ? pins[index]! : null

  const step = useCallback(
    (by: number) => {
      if (index < 0 || pins.length < 2) return
      setOpenId(pins[(index + by + pins.length) % pins.length]!.id)
    },
    [index, pins],
  )

  return (
    <>
      <Composer onPinned={setFresh} />

      {pins.length === 0 ? (
        <EmptyBoard />
      ) : (
        <>
          <div className="mt-8 columns-2 gap-x-3 sm:gap-x-4 lg:mt-12 lg:columns-3 lg:gap-x-6 xl:columns-4">
            <BoardNote note={note} className="mb-8 break-inside-avoid max-lg:hidden" />
            {pins.map((pin) => (
              <Tile key={pin.id} pin={pin} fresh={fresh.includes(pin.id)} onOpen={() => setOpenId(pin.id)} />
            ))}
          </div>
          {/* On the phone the pictures come first and the stylist's note after them. */}
          <BoardNote note={note} className="mt-4 lg:hidden" />
        </>
      )}

      {open ? <Viewer key={open.id} pin={open} count={pins.length} onClose={() => setOpenId(null)} onStep={step} /> : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Pin it
// ---------------------------------------------------------------------------

type Chosen = { key: number; file: File; preview: string }

/** Long edge a picture is brought down to on her phone before it is sent; the server keeps 1568. */
const SEND_EDGE = 2048

/**
 * Pictures (chosen, dropped onto the bar, or pasted anywhere on the page),
 * a link, or both, and a note once there is something to pin. Pictures are
 * scaled down on the device before they are sent, so a handful of phone
 * photos goes up in seconds and never meets the upload limit.
 */
function Composer({ onPinned }: { onPinned: (ids: number[]) => void }) {
  const [chosen, setChosen] = useState<Chosen[]>([])
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<PinResult>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, startTransition] = useTransition()
  const chosenRef = useRef<Chosen[]>([])
  const nextKey = useRef(0)

  const update = useCallback((next: Chosen[]) => {
    chosenRef.current = next
    setChosen(next)
  }, [])

  const add = useCallback(
    (list: Iterable<File>) => {
      const images = [...list].filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name))
      if (images.length === 0) return
      setResult(null)
      update([
        ...chosenRef.current,
        ...images.map((file) => ({ key: nextKey.current++, file, preview: URL.createObjectURL(file) })),
      ])
    },
    [update],
  )

  function drop(key: number) {
    const gone = chosenRef.current.find((item) => item.key === key)
    if (gone) URL.revokeObjectURL(gone.preview)
    update(chosenRef.current.filter((item) => item.key !== key))
  }

  // A screenshot pasted anywhere on the board pins it; a page hidden by <Activity> runs no effects.
  useEffect(() => {
    function paste(event: ClipboardEvent) {
      const pasted = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'))
      if (pasted.length === 0) return
      event.preventDefault()
      add(pasted)
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [add])

  useEffect(() => () => chosenRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const sent = { items: chosenRef.current, url, note }
    startTransition(async () => {
      for (const file of await Promise.all(sent.items.map((item) => shrink(item.file)))) form.append('file', file)
      const answer = await addPins(null, form)
      startTransition(() => {
        setResult(answer)
        if (!answer?.ok) return
        // Only what was sent is cleared: a link typed or a picture added while it went stays.
        const keys = new Set(sent.items.map((item) => item.key))
        sent.items.forEach((item) => URL.revokeObjectURL(item.preview))
        update(chosenRef.current.filter((item) => !keys.has(item.key)))
        setUrl((current) => (current === sent.url ? '' : current))
        setNote((current) => (current === sent.note ? '' : current))
        onPinned(answer.pinned ?? [])
      })
    })
  }

  function onDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault()
    setDragging(false)
    add(event.dataTransfer.files)
  }

  const ready = chosen.length > 0 || url.trim() !== ''
  const expanded = ready || note !== '' || Boolean(result && !result.ok)
  const urlError = result?.errors?.url

  return (
    <form
      onSubmit={submit}
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
      onPaste={(event: ReactClipboardEvent<HTMLFormElement>) => event.stopPropagation()}
      aria-label="Pin it"
      aria-busy={busy || undefined}
      className={`card grid gap-3 p-3 transition-shadow duration-150 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4 ${
        dragging ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : ''
      }`}
    >
      <label className="btn btn-quiet cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-accent">
        <PlusIcon className="size-5" />
        Add pictures
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) add(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      <div className="min-w-0">
        <input
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value)
            if (result?.errors?.url) setResult(null)
          }}
          placeholder="Or paste a link to an outfit"
          aria-label="Link to an outfit"
          aria-invalid={urlError ? true : undefined}
          aria-describedby={urlError ? 'pin-url-error' : undefined}
          className="input"
        />
        {urlError ? (
          <p id="pin-url-error" role="alert" className="mt-1.5 text-sm text-alert">
            {urlError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={busy || !ready}
        aria-busy={busy || undefined}
        className={`btn btn-primary max-sm:order-last sm:col-start-3 sm:row-start-1 sm:min-w-32 ${ready || busy ? '' : 'max-sm:hidden'}`}
      >
        {busy ? (
          <>
            <Spinner />
            Pinning
          </>
        ) : (
          'Pin it'
        )}
      </button>

      {expanded ? (
        <div className="crossfade min-w-0 space-y-3 sm:col-span-3">
          {chosen.length > 0 ? (
            <ul className="flex gap-2 overflow-x-auto pt-1 [scrollbar-width:none]" aria-label="Pictures to pin">
              {chosen.map((item) => (
                <li key={item.key} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet sent */}
                  <img src={item.preview} alt="" className="h-20 w-16 rounded-[0.5rem] bg-surface object-cover" />
                  <button
                    type="button"
                    onClick={() => drop(item.key)}
                    aria-label={`Leave out ${item.file.name || 'this picture'}`}
                    className="pressable absolute -top-3 -right-3 grid size-11 place-items-center"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-ink text-on-ink">
                      <CloseIcon className="size-3.5" strokeWidth={2.2} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            name="note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            autoComplete="off"
            maxLength={500}
            placeholder="What you love about it, if you like"
            aria-label="Your note"
            className="input"
          />
          {result?.message ? (
            <p role={result.ok ? 'status' : 'alert'} className={`text-sm ${result.ok ? 'text-ink-2' : 'text-alert'}`}>
              {result.message}
            </p>
          ) : null}
        </div>
      ) : result?.ok && result.message ? (
        <p role="status" className="text-sm text-ink-2 sm:col-span-3">
          {result.message}
        </p>
      ) : null}
    </form>
  )
}

/** A picture brought down to SEND_EDGE as a JPEG, with nothing of the phone's metadata. Anything it cannot draw goes as it is. */
async function shrink(file: File): Promise<File> {
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, SEND_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 3 * 1024 * 1024) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'pin'}.jpg`, { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

// ---------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------

function sources(pin: Pick<PinView, 'id' | 'width' | 'height'>) {
  const thumbWidth = pin.width >= pin.height ? Math.min(480, pin.width) : Math.round((480 * pin.width) / pin.height)
  return {
    src: `/photos/board/${pin.id}?v=thumb`,
    srcSet: `/photos/board/${pin.id}?v=thumb ${thumbWidth}w, /photos/board/${pin.id} ${pin.width}w`,
  }
}

function Tile({ pin, fresh, onOpen }: { pin: PinView; fresh: boolean; onOpen: () => void }) {
  const ratio = Math.min(TALLEST, Math.max(WIDEST, pin.height / pin.width))
  const label = pin.read?.headline ?? (pin.state === 'reading' ? 'Reading it' : 'Not read yet')
  return (
    <figure className={`mb-6 break-inside-avoid lg:mb-8 ${fresh ? 'tile-enter' : ''}`}>
      <button type="button" onClick={onOpen} className="pressable lift group block w-full text-left" aria-label={`${label}. Open`}>
        <span className="block overflow-hidden rounded-[var(--radius-tile)] bg-surface" style={{ aspectRatio: `1 / ${ratio}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- her own picture, sized by /photos/board behind the sign-in */}
          <img
            {...sources(pin)}
            sizes="(min-width: 1280px) 17rem, (min-width: 1024px) 22vw, 46vw"
            alt=""
            width={pin.width}
            height={pin.height}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </span>
        <figcaption className={`mt-2 flex items-start gap-1.5 text-[0.8125rem] leading-snug ${pin.read ? 'text-ink-2' : 'text-ink-3'}`}>
          {pin.state === 'reading' ? <Spinner className="mt-0.5 size-3.5 shrink-0" /> : null}
          <span className="line-clamp-2">{label}</span>
        </figcaption>
      </button>
    </figure>
  )
}

/** Before the first pin: what to do, then the shape the board will take, in the surface colour. */
function EmptyBoard() {
  const ghosts = ['4 / 5', '1 / 1', '5 / 4', '3 / 4', '4 / 3', '4 / 5', '1 / 1', '3 / 4', '5 / 4']
  return (
    <div className="mt-8 columns-2 gap-x-3 sm:gap-x-4 lg:mt-12 lg:columns-3 lg:gap-x-6 xl:columns-4">
      <div className="mb-8 break-inside-avoid [column-span:all] lg:mb-8 lg:pr-4 lg:[column-span:none]">
        <p className="headline">Start your board</p>
        <p className="mt-3 text-ink-2">
          Pin screenshots, photos and links of outfits you love. Claude reads each one, and once there are a few, says what they
          have in common, for your palette, your plan and the shops.
        </p>
      </div>
      {ghosts.map((ratio, index) => (
        <div
          key={index}
          aria-hidden
          className={`mb-6 break-inside-avoid rounded-[var(--radius-tile)] bg-surface opacity-70 lg:mb-8 ${index > 3 ? 'max-sm:hidden' : ''}`}
          style={{ aspectRatio: ratio }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The viewer
// ---------------------------------------------------------------------------

/**
 * One pin, large, with what Claude read in it. A native dialog, so focus,
 * Escape and the backdrop come free; it opens with the viewer's scale and
 * fade and closes at once. The arrow keys and the two buttons step through
 * the board.
 */
function Viewer({ pin, count, onClose, onStep }: { pin: PinView; count: number; onClose: () => void; onStep: (by: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const read = pin.read
  const titleId = `pin-${pin.id}`
  const over = [read?.occasion ? sentence(read.occasion) : null, `pinned ${pin.pinned}`].filter(Boolean).join(', ')

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('input, textarea')) return
        if (event.key === 'ArrowRight') onStep(1)
        if (event.key === 'ArrowLeft') onStep(-1)
      }}
      className="viewer m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-ground p-0 text-ink backdrop:bg-[var(--scrim)] lg:m-auto lg:h-auto lg:max-h-[92dvh] lg:w-[min(72rem,calc(100vw-4rem))] lg:rounded-[1.5rem]"
    >
      <div className="px-[var(--gutter)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:p-8">
        <div className="flex items-center justify-between gap-2">
          <div className="-ml-2 flex">
            {count > 1 ? (
              <>
                <button type="button" aria-label="The pin before" className="pressable grid size-11 place-items-center rounded-full" onClick={() => onStep(-1)}>
                  <BackIcon />
                </button>
                <button type="button" aria-label="The next pin" className="pressable grid size-11 place-items-center rounded-full" onClick={() => onStep(1)}>
                  <BackIcon className="rotate-180" />
                </button>
              </>
            ) : null}
          </div>
          <button type="button" aria-label="Close" className="pressable -mr-2 grid size-11 place-items-center rounded-full" onClick={onClose} autoFocus>
            <CloseIcon />
          </button>
        </div>

        <div className="mt-2 grid gap-8 lg:mt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-12">
          <figure className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- her own picture, already sized, behind the sign-in */}
            <img
              src={`/photos/board/${pin.id}`}
              alt={read ? read.headline : 'Your pin'}
              width={pin.width}
              height={pin.height}
              style={{ aspectRatio: `${pin.width} / ${pin.height}` }}
              className="mx-auto h-auto max-h-[75dvh] w-auto max-w-full rounded-[var(--radius-tile)] bg-surface object-contain lg:max-h-[calc(92dvh-7rem)]"
            />
          </figure>

          <div className="min-w-0 lg:pt-2">
            <p className="caption">{over}</p>
            <h2 id={titleId} className="headline mt-2">
              {read?.headline ?? (pin.state === 'reading' ? 'Reading it' : 'Not read yet')}
            </h2>

            {read ? (
              <>
                <p className="voice mt-4">{read.take}</p>
                {read.garments.length > 0 ? <p className="mt-5 text-ink">{garmentLine(read.garments)}</p> : null}
                <p className="mt-2 text-ink-2">
                  {sentence(read.silhouette)}. {sentence(read.mood)}.
                </p>
                {pin.colours.length > 0 ? <Colours colours={pin.colours} /> : null}
              </>
            ) : pin.state === 'reading' ? (
              <p className="mt-4 flex items-center gap-2 text-ink-2">
                <Spinner />
                Claude is reading it. This takes a few seconds.
              </p>
            ) : (
              <div className="mt-4">
                <p className="text-ink-2">{pin.failure ?? 'It was not read: the app restarted while it was.'}</p>
                <form action={readAgain} className="mt-3">
                  <input type="hidden" name="id" value={pin.id} />
                  <SubmitButton variant="quiet" size="small" pending="Reading">
                    Read it again
                  </SubmitButton>
                </form>
              </div>
            )}

            <div className="mt-7">
              {editing ? (
                <NoteForm pin={pin} onDone={() => setEditing(false)} />
              ) : pin.note ? (
                <div>
                  <p className="caption">Your note</p>
                  <p className="mt-1 text-ink">{pin.note}</p>
                  <button type="button" className="link text-sm" onClick={() => setEditing(true)}>
                    Change the note
                  </button>
                </div>
              ) : (
                <button type="button" className="link text-sm" onClick={() => setEditing(true)}>
                  Add a note
                </button>
              )}
            </div>

            {pin.url ? (
              <a href={pin.url} target="_blank" rel="noopener noreferrer" className="link mt-1 gap-1.5 text-sm">
                <span className="min-w-0 truncate">{pin.title ? `${pin.title}, ${pin.host}` : `Open ${pin.host ?? 'the page'}`}</span>
                <OutIcon className="size-4 shrink-0" />
              </a>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <HoldButton action={removePin} label="Take it off the board" pendingLabel="Taking it off" fields={<input type="hidden" name="id" value={pin.id} />} />
            </div>
            {pin.cost ? <p className="caption mt-3">Read by Claude for {pin.cost}.</p> : null}
          </div>
        </div>
      </div>
    </dialog>
  )
}

function Colours({ colours }: { colours: PinView['colours'] }) {
  const yours = colours.filter((colour) => colour.yours)
  return (
    <div className="mt-6">
      <ul className="flex flex-wrap gap-x-4 gap-y-3" aria-label="Its colours">
        {colours.map((colour) => (
          <li key={colour.hex} className="flex items-center gap-2">
            <Swatch hex={colour.hex} name={colour.name} className="size-7" />
            <span className="text-sm text-ink-2">{colour.name}</span>
          </li>
        ))}
      </ul>
      {yours.length > 0 ? (
        <p className="mt-3 text-sm text-accent">
          {yours.length === colours.length ? 'All in your palette' : `${sentence(yours.map((colour) => colour.name).join(', '))} ${yours.length === 1 ? 'is' : 'are'} in your palette`}
          {yours.some((colour) => colour.yours !== colour.name)
            ? ` (${yours
                .filter((colour) => colour.yours !== colour.name)
                .map((colour) => `your ${colour.yours}`)
                .join(', ')})`
            : ''}
          .
        </p>
      ) : null}
    </div>
  )
}

/** "A long camel wrap coat, a satin slip skirt and pointed slingbacks." */
function garmentLine(garments: string[]): string {
  const items = garments.map((garment) => garment.trim().replace(/[.]+$/, ''))
  const joined = items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
  return `${sentence(joined)}.`
}

function NoteForm({ pin, onDone }: { pin: PinView; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveNote>>, form: FormData) => {
    const answer = await saveNote(prev, form)
    if (answer?.ok) onDone()
    return answer
  }, null)
  return (
    <form action={action} className="crossfade space-y-3">
      <input type="hidden" name="id" value={pin.id} />
      <label htmlFor={`note-${pin.id}`} className="field-label">
        Your note
      </label>
      <textarea
        id={`note-${pin.id}`}
        name="note"
        rows={3}
        maxLength={500}
        defaultValue={pin.note ?? ''}
        placeholder="What you love about it"
        className="input"
        autoFocus
      />
      {state?.message ? (
        <p role="alert" className="text-sm text-alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-quiet btn-small" disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              Saving
            </>
          ) : (
            'Save the note'
          )}
        </button>
        <button type="button" className="link text-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
