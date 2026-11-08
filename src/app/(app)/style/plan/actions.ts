'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { echo, type ActionState } from '@/lib/action-state'
import {
  BlueprintError,
  createSlot,
  deleteSlot,
  draftRefill,
  draftSlots,
  getSlot,
  insertRefill,
  isKeptOnRedraft,
  listSlots,
  moveSlot,
  parseSlotForm,
  replaceDraft,
  setSlotStatus,
  updateSlot,
} from '@/lib/blueprint'
import { text } from '@/lib/form-parse'
import { getProfile } from '@/lib/profile'
import { GenerationError } from '@/lib/structured'
import { StyleGuideError, getGuide } from '@/lib/style-guide'
import { SLOT_STATUSES, type SlotStatus } from '@/lib/wardrobe-values'

/*
 * The plan's actions (the blueprint in the library): drafting and redrafting
 * it, refilling a retired slot, and a slot's own edits. The guide's actions
 * live beside the palette.
 */

/** Every mutation touches Today, the closet and the plan, so refresh the tree. */
function refreshAll(): void {
  revalidatePath('/', 'layout')
}

/** Errors she can act on become a message; anything else is a bug and throws. */
function expected(error: unknown): string | null {
  if (error instanceof GenerationError || error instanceof StyleGuideError || error instanceof BlueprintError) {
    return error.message
  }
  return null
}

function id(form: FormData): number | null {
  const value = Number(form.get('id'))
  return Number.isInteger(value) && value > 0 ? value : null
}

function note(form: FormData): string | null {
  const value = text(form, 'note')
  return value ? value.slice(0, 1000) : null
}

/** First draft and redraft are the same call: the kept slots are passed in. */
export async function draftPlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const [profile, guide, slots] = await Promise.all([getProfile(), getGuide(), listSlots()])
    if (!guide) return { ok: false, message: 'Draft your palette first. The plan is built from it.' }
    const kept = slots.filter(isKeptOnRedraft)
    const { slots: drafts } = await draftSlots(profile, guide, kept, note(form))
    await replaceDraft(drafts)
  } catch (error) {
    const message = expected(error)
    if (message) return { ok: false, message, values: echo(form) }
    throw error
  }
  refreshAll()
  redirect('/style/plan')
}

export async function refillSlot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const slotId = id(form)
  if (!slotId) return { ok: false, message: 'That piece is not in the plan any more.' }
  let newId: number
  try {
    const [profile, guide, retired, slots] = await Promise.all([getProfile(), getGuide(), getSlot(slotId), listSlots()])
    if (!guide) return { ok: false, message: 'Draft your palette first.' }
    if (!retired || retired.status !== 'retired') return { ok: false, message: 'Only a retired piece can be refilled.' }
    if (retired.refilled_by) return { ok: false, message: 'Something already took its place.' }
    const others = slots.filter((slot) => slot.id !== slotId && slot.status !== 'retired')
    const { slot } = await draftRefill(profile, guide, retired, others, note(form))
    newId = await insertRefill(retired, slot)
  } catch (error) {
    const message = expected(error)
    if (message) return { ok: false, message, values: echo(form) }
    throw error
  }
  refreshAll()
  redirect(`/style/plan/${newId}`)
}

export async function submitSlot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseSlotForm(form)
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values: echo(form) }
  const slotId = id(form)
  if (slotId) await updateSlot(slotId, parsed.data)
  else await createSlot(parsed.data)
  refreshAll()
  redirect(slotId ? `/style/plan/${slotId}` : '/style/plan')
}

export async function changeStatus(form: FormData): Promise<void> {
  const slotId = id(form)
  const status = text(form, 'status')
  if (!slotId || !status || !(SLOT_STATUSES as readonly string[]).includes(status)) return
  await setSlotStatus(slotId, status as SlotStatus)
  refreshAll()
}

export async function reorderSlot(form: FormData): Promise<void> {
  const slotId = id(form)
  const direction = text(form, 'direction')
  if (!slotId || (direction !== 'up' && direction !== 'down')) return
  await moveSlot(slotId, direction)
  refreshAll()
}

export async function removeSlot(form: FormData): Promise<void> {
  const slotId = id(form)
  if (slotId) await deleteSlot(slotId)
  refreshAll()
  redirect('/style/plan')
}
