'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'

import { seeLookOnMe } from '@/app/actions/try-on'
import type { Look } from '@/lib/looks'
import type { OnMe, Started } from '@/lib/try-on'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { Spinner } from '../ui/form.tsx'
import { CloseIcon } from '../ui/icons.tsx'
import { PiecePicture } from '../ui/photos.tsx'

/*
 * "See it on me", for a find, a look or a chosen outfit alike. A tap records
 * the request and OpenAI makes the image on the server, about a minute; the
 * control asks for its status every few seconds meanwhile, and again if she
 * leaves and comes back. Once ready, it shows her in it, small, and opens the
 * mirror: the picture in the arch, beside what it was made from, so the
 * colour can be judged against the clothes themselves.
 *
 * `initial` is the kept picture of the same outfit, whichever look, find or
 * choice it was made for, so nothing offers to make one that is there. "Make
 * it again" in the mirror is the one way to ask for another.
 */

const POLL_MS = 3000

type Local = OnMe | { status: 'refused'; error: string }

/** The status route sends dates as strings. */
function revive(raw: OnMe): OnMe {
  return { ...raw, started_at: new Date(raw.started_at), photo_taken: new Date(raw.photo_taken) }
}

function madeOn(onMe: OnMe): string {
  return onMe.started_at.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', timeZone: 'Pacific/Auckland' })
}

export type MirrorContent = {
  /** The shop, or the look's occasion, over the title. */
  over: string
  title: string
  /** "You wearing the linen wrap dress". */
  alt: string
  /** What it was made from, beside the picture. */
  aside: ReactNode
  /** How to read the picture. */
  note: ReactNode
  /** Links before "Make it again", such as the shop's page. */
  actions?: ReactNode
}

export function TryOn({
  initial,
  start: request,
  content,
  label = 'See it on me',
}: {
  initial: OnMe | null
  start: (again: boolean) => Promise<Started>
  content: MirrorContent
  label?: string
}) {
  const [state, setState] = useState<Local | null>(initial)
  const [starting, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const making = starting || state?.status === 'making'

  const makingId = state?.status === 'making' ? state.id : null
  useEffect(() => {
    if (makingId === null) return
    let stopped = false
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/photos/try-ons/${makingId}/status`, { cache: 'no-store' })
        if (!response.ok || stopped) return
        const next = revive((await response.json()) as OnMe)
        if (next.status !== 'making' && !stopped) setState(next)
      } catch {
        // Offline for a moment; the next tick tries again.
      }
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [makingId])

  function start(again: boolean) {
    setOpen(false)
    startTransition(async () => {
      const result = await request(again)
      if (!result.ok) {
        setState({ status: 'refused', error: result.message })
        return
      }
      if (result.reused) {
        try {
          const response = await fetch(`/photos/try-ons/${result.id}/status`, { cache: 'no-store' })
          if (response.ok) {
            setState(revive((await response.json()) as OnMe))
            return
          }
        } catch {
          // Fall through and let the polling find it.
        }
      }
      setState({
        id: result.id,
        status: 'making',
        error: null,
        width: null,
        height: null,
        usd: null,
        started_at: new Date(),
        photo_taken: new Date(),
      })
    })
  }

  const ready = state?.status === 'ready' ? state : null

  return (
    <div>
      {making ? (
        <div aria-live="polite" className="flex min-h-12 items-center gap-3">
          <Spinner className="size-5 text-accent" />
          <span>
            <span className="block font-semibold">Putting it on you</span>
            <span className="block text-sm text-ink-3">About a minute. It carries on if you leave.</span>
          </span>
        </div>
      ) : ready ? (
        <button type="button" className="pressable flex items-center gap-3 text-left" onClick={() => setOpen(true)} aria-haspopup="dialog">
          {/* eslint-disable-next-line @next/next/no-img-element -- a private, already-sized file; the optimiser would only copy it */}
          <img
            src={`/photos/try-ons/${ready.id}`}
            alt=""
            width={ready.width ?? 3}
            height={ready.height ?? 4}
            className="aspect-[3/4] w-14 shrink-0 rounded-[999px_999px_0.5rem_0.5rem] bg-photo object-cover"
          />
          <span>
            <span className="block font-semibold text-accent">{label}</span>
            <span className="block text-sm text-ink-3">Made {madeOn(ready)}</span>
          </span>
        </button>
      ) : (
        <div aria-live="polite">
          <button type="button" className="btn btn-quiet" onClick={() => start(false)}>
            {state ? 'Try it on again' : label}
          </button>
          {state?.error ? <p className="mt-2 text-sm text-alert">{state.error}</p> : null}
        </div>
      )}
      {ready ? <Mirror onMe={ready} content={content} open={open} onClose={() => setOpen(false)} onAgain={() => start(true)} /> : null}
    </div>
  )
}

/**
 * The mirror: her in the outfit, in the arch, with what it was made from
 * beside it. A native dialog, so focus, Escape and the backdrop come free.
 * It opens with a short scale and fade from its centre (it is not anchored
 * to the button) and closes at once.
 */
function Mirror({
  onMe,
  content,
  open,
  onClose,
  onAgain,
}: {
  onMe: OnMe
  content: MirrorContent
  open: boolean
  onClose: () => void
  onAgain: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const titleId = `mirror-${onMe.id}`
  const width = onMe.width ?? 3
  const height = onMe.height ?? 4

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="viewer m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-ground p-0 text-ink backdrop:bg-[var(--scrim)] lg:m-auto lg:h-auto lg:max-h-[92dvh] lg:w-[min(68rem,calc(100vw-4rem))] lg:rounded-[1.5rem]"
    >
      <div className="px-[var(--gutter)] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:p-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="caption">{content.over}</p>
            <h2 id={titleId} className="headline mt-1">
              {content.title}
            </h2>
          </div>
          <button type="button" aria-label="Close" className="pressable -mr-2 grid size-11 shrink-0 place-items-center rounded-full" onClick={onClose} autoFocus>
            <CloseIcon />
          </button>
        </header>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
          <figure className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- a private, already-sized file; the optimiser would only copy it */}
            <img
              src={`/photos/try-ons/${onMe.id}`}
              alt={content.alt}
              width={width}
              height={height}
              style={{ aspectRatio: `${width} / ${height}` }}
              className="mx-auto h-auto w-full max-w-[34rem] rounded-[var(--radius-arch)] bg-photo object-cover lg:max-h-[calc(92dvh-12rem)] lg:w-auto"
            />
            <figcaption className="caption mt-3 text-center">On you, made {madeOn(onMe)}</figcaption>
          </figure>

          <div className="min-w-0">
            {content.aside}
            <p className="mt-4 text-sm text-ink-2">{content.note}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {content.actions}
              <button type="button" className="link" onClick={onAgain}>
                Make it again
              </button>
            </div>
            {onMe.usd !== null ? <p className="caption mt-2">This one cost US${onMe.usd.toFixed(2)}.</p> : null}
          </div>
        </div>
      </div>
    </dialog>
  )
}

/** "See it on me" for a whole look: her in it, beside the pieces it was made from. */
export function LookOnMe({ look, occasion }: { look: Look; occasion: string }) {
  const unseen = look.pieces.filter((piece) => !piece.photo && !piece.image).length
  const all = unseen === look.pieces.length
  return (
    <TryOn
      initial={look.on_me}
      start={(again) => seeLookOnMe(look.id, again)}
      content={{
        over: occasion,
        title: look.title,
        alt: `You wearing ${look.title.toLowerCase()}`,
        aside: (
          <figure>
            <div className="grid grid-cols-3 gap-2">
              {look.pieces.map((piece) => (
                <PiecePicture key={piece.id} piece={piece} label={GARMENT_LABELS[piece.garment_type]} sizes="7rem" className="aspect-[3/4]" />
              ))}
            </div>
            <figcaption className="caption mt-2">Your pieces</figcaption>
          </figure>
        ),
        note: (
          <>
            Made by OpenAI from your full-length photo and the photos of your pieces. It cannot know how each one sits on you.
            {unseen === 0
              ? null
              : all
                ? ' None of these pieces has a photo yet, so each was drawn from its description.'
                : ` ${unseen === 1 ? 'One piece has' : `${unseen} pieces have`} no photo yet, so ${unseen === 1 ? 'it was' : 'they were'} drawn from the description.`}
          </>
        ),
      }}
    />
  )
}
