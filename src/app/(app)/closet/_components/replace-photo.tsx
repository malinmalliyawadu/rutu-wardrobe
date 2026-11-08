'use client'

import { useActionState, type CSSProperties } from 'react'
import { useFormStatus } from 'react-dom'

import { FormMessage, Spinner } from '@/components/ui/form'
import { CameraIcon } from '@/components/ui/icons'

import { replacePhoto } from '../actions.ts'

/** Choosing a file sends it at once. The photo is read on our own server only; the details stay as she saved them. */
export function ReplacePhoto({ id, hasPhoto }: { id: number; hasPhoto: boolean }) {
  const [state, action] = useActionState(replacePhoto, null)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Choose label={hasPhoto ? 'Replace the photo' : 'Add a photo'} />
      {state?.message ? <FormMessage message={state.message} /> : null}
    </form>
  )
}

function Choose({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <label
      className={`link cursor-pointer gap-2 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${pending ? 'cursor-progress' : ''}`}
    >
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          if (event.target.files?.length) event.target.form?.requestSubmit()
        }}
      />
      {pending ? <Spinner /> : <CameraIcon className="size-[1.125rem]" />}
      {pending ? 'Adding the photo' : label}
    </label>
  )
}

/**
 * A piece with no photo yet, on its page: its colour as the picture, and the
 * whole tile is the way to add one. Shorter on the phone, where a tall block
 * of one colour would push the piece's name off the screen.
 */
export function AddPhotoTile({ id, hex, name }: { id: number; hex: string | null; name: string }) {
  const [state, action] = useActionState(replacePhoto, null)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <TileLabel hex={hex} name={name} />
      {state?.message ? (
        <div className="mt-2">
          <FormMessage message={state.message} />
        </div>
      ) : null}
    </form>
  )
}

function TileLabel({ hex, name }: { hex: string | null; name: string }) {
  const { pending } = useFormStatus()
  return (
    <label
      data-colour={hex ? name : undefined}
      style={{ '--swatch': hex ?? 'var(--surface)' } as CSSProperties}
      className={`swatch pressable relative grid aspect-[3/2] w-full cursor-pointer place-items-center rounded-[var(--radius-tile)] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent lg:aspect-[3/4] ${pending ? 'cursor-progress' : ''}`}
    >
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          if (event.target.files?.length) event.target.form?.requestSubmit()
        }}
      />
      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ground/90 px-4 text-sm font-semibold text-ink">
        {pending ? <Spinner /> : <CameraIcon className="size-[1.125rem]" />}
        {pending ? 'Adding the photo' : 'Add a photo'}
      </span>
    </label>
  )
}
