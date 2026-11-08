'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'

import { feedAction } from '@/app/actions/feed'
import { HeartIcon } from '@/components/ui/icons'

type SlotOption = { id: number; name: string }

/*
 * Save on a tile in All shops. With pieces open in her plan, one tap asks,
 * over the photo, which it is for, already set to the one the finder matched
 * it to or the first of the same kind; a second saves it. Without, one tap
 * saves. Saved, it says so at once and the tile stays. If the save fails,
 * the choice comes back.
 */
export function SaveChoice({
  productId,
  title,
  defaultSlotId,
  sameKind,
  others,
  again = false,
}: {
  productId: number
  title: string
  defaultSlotId: number | null
  /** Open slots for the same garment, listed first. */
  sameKind: SlotOption[]
  others: SlotOption[]
  /** She passed on it before; saving it now overrides that. */
  again?: boolean
}) {
  const [mode, setMode] = useState<'idle' | 'choose' | 'saved'>('idle')
  const [failed, setFailed] = useState(false)
  const [slot, setSlot] = useState(defaultSlotId === null ? '' : String(defaultSlotId))
  const [, startTransition] = useTransition()
  const selectId = useId()
  const hasSlots = sameKind.length + others.length > 0
  const panel = useRef<HTMLDivElement>(null)

  // The question opens over the photo, before the button in the page's order, so focus moves into it.
  useEffect(() => {
    if (mode === 'choose') panel.current?.querySelector('select')?.focus({ preventScroll: true })
  }, [mode])

  function save(slotId: string) {
    setMode('saved')
    setFailed(false)
    startTransition(async () => {
      const result = await feedAction({ action: 'saved', product_id: productId, slot_id: slotId ? Number(slotId) : null })
      if (!result.ok) {
        setMode(hasSlots ? 'choose' : 'idle')
        setFailed(true)
      }
    })
  }

  const option = (slot: SlotOption) => (
    <option key={slot.id} value={slot.id}>
      {slot.name}
    </option>
  )

  return (
    <div>
      {mode === 'saved' ? (
        <p role="status" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">
          <HeartIcon filled className="size-[1.125rem]" />
          On your wishlist
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-quiet btn-small"
          aria-label={`Save ${title}`}
          aria-expanded={hasSlots ? mode === 'choose' : undefined}
          onClick={() => (hasSlots ? setMode(mode === 'choose' ? 'idle' : 'choose') : save(''))}
        >
          <HeartIcon className="size-[1.125rem]" />
          {again ? 'Save it after all' : 'Save'}
        </button>
      )}
      {mode === 'choose' ? (
        // Asked over the photo (the tile is relative, its photo the first thing in it), so the tiles beside it do not move.
        <div
          ref={panel}
          role="group"
          aria-label={`Save ${title}`}
          className="crossfade absolute inset-x-0 top-0 flex aspect-[4/5] flex-col justify-end rounded-[var(--radius-tile)] bg-raised/95 p-3 shadow-[inset_0_0_0_1px_var(--line)] sm:p-4"
        >
          <label htmlFor={selectId} className="title text-[0.9375rem] sm:text-[1.0625rem]">
            Which piece in your plan is it for?
          </label>
          <select
            id={selectId}
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
            className="input mt-3 min-h-11 py-2"
          >
            <option value="">None, just save it</option>
            {sameKind.length > 0 && others.length > 0 ? (
              <>
                <optgroup label="The same kind">{sameKind.map(option)}</optgroup>
                <optgroup label="Others">{others.map(option)}</optgroup>
              </>
            ) : (
              [...sameKind, ...others].map(option)
            )}
          </select>
          <div className="mt-2 flex flex-wrap items-center gap-x-4">
            <button type="button" className="btn btn-primary btn-small" onClick={() => save(slot)}>
              Save
            </button>
            <button type="button" className="link text-sm text-ink-3" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {failed ? (
        <p role="alert" className="mt-1 text-sm text-alert">
          That did not save. Try again.
        </p>
      ) : null}
    </div>
  )
}
