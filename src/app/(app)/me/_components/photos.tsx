'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { HoldButton } from '@/components/ui/hold-button'
import { CameraIcon, CloseIcon } from '@/components/ui/icons'
import { Field, FormMessage, NumberInput, Spinner, SubmitButton, withEcho } from '@/components/ui/form'
import type { Photo, PhotoKind } from '@/lib/photos'

import { deleteAllPhotos, deletePhoto, runAnalysis, submitHeight, uploadPhoto } from '../actions'

/*
 * The photos page's controls: her height, a shelf of arches for each kind of
 * photo with an empty mirror to add one, the read, and hold to delete them
 * all. Pictures of her are arches; nothing else on the page is.
 */

/** Height on its own, saved in place; the rest of the sizes page is left as it is. */
export function HeightForm({ heightCm }: { heightCm: number | null }) {
  const [state, action] = useActionState(submitHeight, null)
  const v = withEcho({ height_cm: heightCm }, state?.values)
  const error = state?.errors?.height_cm
  return (
    <form action={action} className="max-w-md">
      <Field label="Height" name="height_cm" error={error}>
        <div className="flex gap-3">
          <div className="w-36">
            <NumberInput name="height_cm" defaultValue={v.height_cm} unit="cm" error={error} />
          </div>
          <SubmitButton variant="quiet" pending="Saving">
            {heightCm ? 'Change' : 'Save'}
          </SubmitButton>
        </div>
      </Field>
    </form>
  )
}

export function PhotoShelf({
  kind,
  title,
  hint,
  photos,
  max,
}: {
  kind: PhotoKind
  title: string
  hint: string
  photos: Photo[]
  max: number
}) {
  const [state, action] = useActionState(uploadPhoto, null)
  return (
    <section aria-labelledby={`shelf-${kind}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`shelf-${kind}`} className="headline">
          {title}
        </h2>
        <p className="caption tabular shrink-0">
          {photos.length} of {max}
        </p>
      </div>
      <p className="prose-measure mt-2 text-ink-2">{hint}</p>
      <ul className="mt-6 grid grid-cols-2 gap-4">
        {photos.map((photo) => (
          <li key={photo.id} className="tile-enter relative">
            <Portrait photo={photo} alt={title} />
            <form action={deletePhoto} className="absolute right-2 bottom-2">
              <input type="hidden" name="id" value={photo.id} />
              <RemoveButton />
            </form>
          </li>
        ))}
        {photos.length < max ? (
          <li>
            <form action={action}>
              <input type="hidden" name="kind" value={kind} />
              <AddMirror first={photos.length === 0} />
            </form>
          </li>
        ) : null}
      </ul>
      {state?.message ? (
        <div className="mt-3">
          <FormMessage message={state.message} />
        </div>
      ) : null}
    </section>
  )
}

/** One of her photos in the arch, the thumb on the phone and the master where the arch is wide. */
function Portrait({ photo, alt }: { photo: Photo; alt: string }) {
  const width = photo.width ?? 1176
  const height = photo.height ?? 1568
  const thumbWidth = Math.round((width * 480) / Math.max(width, height))
  return (
    <div className="arch aspect-[3/4]">
      {/* Her own photos come through /photos, never the image optimiser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/photos/${photo.id}?v=thumb`}
        srcSet={`/photos/${photo.id}?v=thumb ${thumbWidth}w, /photos/${photo.id} ${width}w`}
        sizes="(min-width: 1024px) 17rem, 44vw"
        alt={alt}
        width={width}
        height={height}
        className="size-full object-cover"
      />
    </div>
  )
}

/**
 * An empty mirror that opens the photo picker. Choosing a file submits at
 * once, and the mirror says so while the upload runs.
 */
function AddMirror({ first }: { first: boolean }) {
  const { pending } = useFormStatus()
  return (
    <label
      className={`arch pressable flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 bg-surface px-4 text-center text-sm font-medium text-ink-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-3 has-[input:focus-visible]:outline-accent ${pending ? 'cursor-progress' : ''}`}
    >
      <span aria-hidden className="absolute inset-[7%] rounded-[var(--radius-arch)] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
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
      {pending ? (
        <>
          <Spinner className="size-5" />
          <span>Adding</span>
        </>
      ) : (
        <>
          <CameraIcon className="size-6" />
          <span>{first ? 'Add a photo' : 'Add another'}</span>
        </>
      )}
    </label>
  )
}

function RemoveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Remove this photo"
      className="pressable flex size-11 items-center justify-center rounded-full bg-raised text-ink shadow-[inset_0_0_0_1px_var(--line)] disabled:opacity-50"
    >
      {pending ? <Spinner /> : <CloseIcon className="size-[1.125rem]" />}
    </button>
  )
}

/** The read: Opus looks at her face and full-length photos and proposes her colouring and proportions. */
export function ReadButton({ ready, again, note }: { ready: boolean; again: boolean; note: string }) {
  const [state, action] = useActionState(runAnalysis, null)
  return (
    <form action={action}>
      <fieldset disabled={!ready} className="group">
        <SubmitButton pending="Reading your photos" className="group-disabled:opacity-45">
          {again ? 'Read them again' : 'Read my colouring'}
        </SubmitButton>
      </fieldset>
      <ReadNote note={note} />
      {state?.message ? (
        <div className="mt-4">
          <FormMessage message={state.message} />
        </div>
      ) : null}
    </form>
  )
}

/** What the read needs or takes, and while it runs, that it is running. */
function ReadNote({ note }: { note: string }) {
  const { pending } = useFormStatus()
  return (
    <p className="prose-measure mt-3 text-sm text-ink-3" aria-live="polite">
      {pending ? 'Reading your colouring and proportions. About a minute; stay on this page.' : note}
    </p>
  )
}

export function DeleteAll({ count }: { count: number }) {
  return (
    <HoldButton
      action={deleteAllPhotos}
      label={count === 1 ? 'Delete your photo' : `Delete all ${count} photos`}
      pendingLabel="Deleting"
    />
  )
}
