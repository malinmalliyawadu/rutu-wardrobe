'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'

import { BackIcon, CheckIcon } from '@/components/ui/icons'
import { Swatches } from '@/components/ui/swatch'

import { reorderSlot } from '../plan/actions'
import type { SlotRow } from './slot-values'
import { STATUS_WORDS } from './status-words'

type Move = { id: number; direction: 'up' | 'down' }

function applyMove(rows: SlotRow[], { id, direction }: Move): SlotRow[] {
  const index = rows.findIndex((row) => row.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[target]] = [next[target] as SlotRow, next[index] as SlotRow]
  return next
}

/**
 * One priority of the plan: its name, what it adds up to, and its pieces in
 * buying order. "Reorder" turns the rows into up and down buttons; a move
 * shows at once and is saved behind it. Nothing animates: reordering is a run
 * of quick taps, and motion would only lag them.
 */
export function SlotGroup({ title, hint, summary, rows }: { title: string; hint: string; summary: string; rows: SlotRow[] }) {
  const [reordering, setReordering] = useState(false)
  const [shown, move] = useOptimistic(rows, applyMove)
  const [, startTransition] = useTransition()
  const headingId = `priority-${title.toLowerCase().replace(/\s+/g, '-')}`

  function send(id: number, direction: 'up' | 'down') {
    startTransition(async () => {
      move({ id, direction })
      const form = new FormData()
      form.set('id', String(id))
      form.set('direction', direction)
      await reorderSlot(form)
    })
  }

  return (
    <section aria-labelledby={headingId} className="mt-14 first:mt-0 lg:mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="headline">
          {title}
        </h2>
        <p className="caption tabular">{summary}</p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-2">{hint}</p>
        {rows.length > 1 ? (
          <button type="button" className="link shrink-0 text-sm" aria-pressed={reordering} onClick={() => setReordering((value) => !value)}>
            {reordering ? 'Done' : 'Reorder'}
          </button>
        ) : null}
      </div>

      <ol className="mt-3 border-t border-line">
        {shown.map((row, index) => (
          <li key={row.id} className="border-b border-line">
            {reordering ? (
              <div className="flex min-h-18 items-center gap-3 py-3 sm:gap-4">
                <RowSwatches row={row} />
                <p className="title min-w-0 flex-1">{row.name}</p>
                <div className="flex shrink-0 gap-1.5">
                  <MoveButton label={`Move ${row.name} up`} disabled={index === 0} onClick={() => send(row.id, 'up')} up />
                  <MoveButton label={`Move ${row.name} down`} disabled={index === shown.length - 1} onClick={() => send(row.id, 'down')} />
                </div>
              </div>
            ) : (
              <SlotLink row={row} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function RowSwatches({ row, muted = false }: { row: SlotRow; muted?: boolean }) {
  return (
    <span className={`flex w-10 shrink-0 sm:w-[3.25rem] ${muted ? 'opacity-50' : ''}`}>
      <Swatches colours={row.colours} className="h-12 w-3 sm:w-4" />
    </span>
  )
}

/** A piece of the plan as a row: its colours, its name, why, and where it stands. */
export function SlotLink({ row, muted = false }: { row: SlotRow; muted?: boolean }) {
  return (
    <Link href={`/style/plan/${row.id}`} className="pressable group flex items-start gap-3 py-4 sm:gap-4">
      <RowSwatches row={row} muted={muted} />
      <span className="min-w-0 flex-1">
        <span className={`title block ${muted ? 'text-ink-2' : ''}`}>{row.name}</span>
        <span className="mt-1 line-clamp-2 block text-[0.9375rem] text-ink-2">{row.why}</span>
        <span className={`mt-1.5 flex items-center gap-1 text-[0.8125rem] font-medium tabular ${row.status === 'owned' ? 'text-accent' : 'text-ink-3'}`}>
          {row.status === 'owned' ? <CheckIcon className="size-4" /> : null}
          {STATUS_WORDS[row.status]}
          {row.band && row.status !== 'owned' ? `, ${row.band}` : ''}
        </span>
      </span>
      <BackIcon className="mt-0.5 size-5 shrink-0 rotate-180 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  )
}

function MoveButton({ label, disabled, onClick, up = false }: { label: string; disabled: boolean; onClick: () => void; up?: boolean }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="btn btn-quiet btn-small size-11 p-0">
      <BackIcon className={`size-5 ${up ? 'rotate-90' : '-rotate-90'}`} />
    </button>
  )
}
