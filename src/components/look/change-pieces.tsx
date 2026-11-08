'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'

import { remakeLook } from '@/app/actions/look'
import { REMAKE_NOTE_MAX, wholeWithout } from '@/lib/look-rules'
import type { Look } from '@/lib/looks'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { Spinner } from '../ui/form.tsx'
import { PiecePicture } from '../ui/photos.tsx'
import { Refresh } from '../ui/refresh.tsx'

/*
 * Changing a look's pieces, in place of its list of pieces: each piece with
 * Swap (for another of hers, Opus's pick) and Remove (nothing in its place),
 * a line for what she wants, and "Remake the look". Remove is off for a piece
 * the look cannot stand without; those swap. Opus takes ten to thirty
 * seconds; the card waits, and the remade look takes this one's place. Opened
 * from another tab while a remake is being made, it shows that one and asks
 * the server again until it is done.
 */

type Mark = 'swap' | 'remove'

export function ChangePieces({ look, onClose }: { look: Look; onClose: () => void }) {
  const [marks, setMarks] = useState<Map<number, Mark>>(() => {
    const from = look.remaking
    return new Map<number, Mark>([
      ...(from?.swap ?? []).map((id) => [id, 'swap'] as const),
      ...(from?.remove ?? []).map((id) => [id, 'remove'] as const),
    ])
  })
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const noteId = useId()
  const busy = pending || look.remaking !== null

  const removed = new Set([...marks].filter(([, mark]) => mark === 'remove').map(([id]) => id))
  const canRemove = (id: number) => removed.has(id) || wholeWithout(look.pieces, new Set([...removed, id]))
  const locked = look.pieces.some((piece) => !canRemove(piece.id))

  function toggle(id: number, mark: Mark) {
    setError(null)
    setMarks((current) => {
      const next = new Map(current)
      if (next.get(id) === mark) next.delete(id)
      else next.set(id, mark)
      return next
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (marks.size === 0 || busy) return
    setError(null)
    const ask = {
      look_id: look.id,
      swap: [...marks].filter(([, mark]) => mark === 'swap').map(([id]) => id),
      remove: [...removed],
      note: note.trim() || null,
    }
    startTransition(async () => {
      const result = await remakeLook(ask)
      if (!result.ok) setError(result.message)
    })
  }

  return (
    <form onSubmit={submit} className="crossfade card mt-2 p-4 sm:p-5" aria-label={`Change the pieces of ${look.title}`}>
      <ul className="divide-y divide-line">
        {look.pieces.map((piece) => {
          const mark = marks.get(piece.id)
          return (
            <li key={piece.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
              <PiecePicture
                piece={piece}
                sizes="3rem"
                className={`h-16 w-13 shrink-0 transition-opacity duration-150 ${mark ? 'opacity-40' : ''}`}
              />
              <span className="min-w-0 flex-1 leading-snug">
                <span className={`block ${mark === 'remove' ? 'text-ink-3 line-through' : ''}`}>{piece.name}</span>
                <span className="caption mt-0.5 block">
                  {mark === 'swap' ? 'For another of yours' : mark === 'remove' ? 'Removed' : GARMENT_LABELS[piece.garment_type]}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                <button type="button" aria-pressed={mark === 'swap'} disabled={busy} className="chip disabled:opacity-50" onClick={() => toggle(piece.id, 'swap')}>
                  Swap
                </button>
                <button
                  type="button"
                  aria-pressed={mark === 'remove'}
                  disabled={busy || !canRemove(piece.id)}
                  className="chip disabled:opacity-40"
                  onClick={() => toggle(piece.id, 'remove')}
                >
                  Remove
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      {locked ? (
        <p className="mt-1 text-sm text-ink-3">A look needs something to wear on top and below, and shoes, so those swap rather than go.</p>
      ) : null}

      <label htmlFor={noteId} className="field-label mt-5">
        Anything in particular?
      </label>
      <input
        id={noteId}
        type="text"
        value={note}
        maxLength={REMAKE_NOTE_MAX}
        disabled={busy}
        placeholder="Flats instead of heels, nothing black"
        onChange={(event) => setNote(event.target.value)}
        className="input"
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={marks.size === 0 || busy} className="btn btn-quiet btn-small">
          {busy ? (
            <>
              <Spinner /> Remaking
            </>
          ) : (
            'Remake the look'
          )}
        </button>
        {busy ? null : (
          <button type="button" className="link text-ink-2" onClick={onClose}>
            Keep it
          </button>
        )}
      </div>
      {busy ? (
        <p role="status" className="mt-2 text-sm text-ink-3">
          Remaking it around the pieces you kept. Under half a minute.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      ) : null}
      {look.remaking && !pending ? <Refresh /> : null}
    </form>
  )
}
