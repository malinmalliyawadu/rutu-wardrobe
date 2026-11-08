'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { makeLookImage, startLookImage } from '@/lib/look-image'
import { runRemake, startRemake, type RemakeAsk } from '@/lib/look-remake'
import { actOnLook, type LookAction } from '@/lib/looks'

/*
 * What can be done to a look wherever it is shown: on Today and in the
 * closet's looks alike.
 */

/** Save, un-save, dismiss with a reason, wore it. The card shows it at once; this makes it so. */
export async function lookAction(input: LookAction): Promise<{ ok: boolean }> {
  try {
    await actOnLook(input)
  } catch {
    return { ok: false }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * A look with pieces swapped or removed, remade by Opus around the rest (ten
 * to thirty seconds; the card waits). The remake takes the old look's place;
 * when it is the day's option on show, its picture is drawn after the response.
 */
export async function remakeLook(input: RemakeAsk): Promise<{ ok: true } | { ok: false; message: string }> {
  const started = await startRemake(input)
  if (!started.ok) return started
  const done = await runRemake(started.id)
  revalidatePath('/', 'layout')
  if (!done.ok) return done
  if (done.onShow) {
    const imageId = await startLookImage(done.lookId)
    if (imageId !== null) {
      after(async () => {
        await makeLookImage(imageId)
      })
    }
  }
  return { ok: true }
}
