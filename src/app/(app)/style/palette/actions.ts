'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { echo, type ActionState } from '@/lib/action-state'
import { text } from '@/lib/form-parse'
import { getProfile } from '@/lib/profile'
import { GenerationError } from '@/lib/structured'
import {
  StyleGuideError,
  draftGuide,
  isRuleSection,
  parseFitsForm,
  parsePaletteForm,
  parseSectionForm,
  saveFits,
  saveGuide,
  savePalette,
  saveSection,
} from '@/lib/style-guide'

/*
 * The style guide's actions: drafting it (and drafting it again), and one
 * save per section. Every save goes back to the palette.
 */

/** Every mutation touches Today, the ribbon in the header and the plan, so refresh the tree. */
function refreshAll(): void {
  revalidatePath('/', 'layout')
}

export async function generateGuide(): Promise<ActionState> {
  try {
    const { guide, meta } = await draftGuide(await getProfile())
    await saveGuide(guide, meta)
  } catch (error) {
    if (error instanceof GenerationError || error instanceof StyleGuideError) return { ok: false, message: error.message }
    throw error
  }
  refreshAll()
  redirect('/style/palette')
}

export async function submitPalette(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parsePaletteForm(form)
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values: echo(form) }
  await savePalette(parsed.data)
  refreshAll()
  redirect('/style/palette')
}

export async function submitSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const section = text(form, 'section') ?? ''
  if (!isRuleSection(section)) return { ok: false, message: 'That part of the guide does not exist.' }
  const parsed = parseSectionForm(form)
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values: echo(form) }
  await saveSection(section, parsed.data)
  refreshAll()
  redirect(`/style/palette#${section}`)
}

export async function submitFits(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseFitsForm(form)
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values: echo(form) }
  await saveFits(parsed.data)
  refreshAll()
  redirect('/style/palette#fits')
}
