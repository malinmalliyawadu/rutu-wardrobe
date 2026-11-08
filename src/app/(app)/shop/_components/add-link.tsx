'use client'

import { startTransition, useActionState, useState } from 'react'

import { addLinkToSaved, chooseFindPhoto, type FindPhotoState } from '@/app/actions/feed'
import { Spinner, SubmitButton } from '@/components/ui/form'
import { CameraIcon } from '@/components/ui/icons'
import type { FindPhoto } from '@/lib/find-photos'
import type { ProductPhotos } from '@/lib/product-photos'
import { GARMENT_GROUPS, GARMENT_LABELS, type GarmentType } from '@/lib/wardrobe-values'

import { PhotoChoice } from '@/components/ui/photo-choice'

/**
 * Paste a product link from any of the shops and it joins the wishlist. The
 * shop is read there and then, so the button says so while it waits. Once it
 * is in, the shop's photos come up under the form, to choose the one it
 * shows or to add her own. A link from a shop that cannot be read opens the
 * fields to add it by hand as soon as it is pasted: its photo, what it is,
 * the price, and the colour and size she wants.
 */

export type ManualStore = { name: string; currency: string; hosts: string[] }
export type OpenSlot = { id: number; name: string; garment_type: GarmentType }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

function storeFor(link: string, stores: ManualStore[]): ManualStore | null {
  let host: string
  try {
    host = new URL(link.trim()).host.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
  return stores.find((store) => store.hosts.includes(host)) ?? null
}

export function AddLink({ slots, manualStores }: { slots: OpenSlot[]; manualStores: ManualStore[] }) {
  const [state, action] = useActionState(addLinkToSaved, null)
  const [photoState, photoAction, photoPending] = useActionState(chooseFindPhoto, null)
  const values = state?.ok ? undefined : state?.values
  const errors = state?.errors ?? {}

  const [link, setLink] = useState(values?.link ?? '')
  const [slotId, setSlotId] = useState(values?.slot_id ?? '')
  const [kind, setKind] = useState<string | null>(values?.garment_type ?? null)
  const [photo, setPhoto] = useState<FindPhoto | null>(null)
  const [round, setRound] = useState(0)
  const [added, setAdded] = useState<ProductPhotos | null>(null)

  // Each answer from the server, once: a new photo replaces the last, and an add clears the form for the next.
  const [seenPhoto, setSeenPhoto] = useState<FindPhotoState>(photoState)
  if (photoState !== seenPhoto) {
    setSeenPhoto(photoState)
    if (photoState?.photo) setPhoto(photoState.photo)
  }
  const [seenAdd, setSeenAdd] = useState(state)
  if (state !== seenAdd) {
    setSeenAdd(state)
    if (state?.ok) {
      setLink('')
      setSlotId('')
      setKind(null)
      setPhoto(null)
      setRound(round + 1)
      setAdded(state.added ?? null)
    }
  }

  const store = storeFor(link, manualStores)
  const slotKind = slots.find((slot) => String(slot.id) === slotId)?.garment_type ?? ''
  const linkError = errors.link

  return (
    <div>
      <form key={round} action={action}>
        <label htmlFor="wish-link" className="field-label">
          Add something you want
        </label>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="wish-link"
            name="link"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={store ? 'next' : 'go'}
            placeholder="Paste a link from any of the shops"
            defaultValue={values?.link ?? ''}
            onChange={(event) => setLink(event.target.value)}
            aria-invalid={linkError ? true : undefined}
            aria-describedby={linkError ? 'wish-link-error' : undefined}
            className={`input ${slots.length > 0 ? 'sm:col-span-2' : ''}`}
          />
          {slots.length > 0 ? (
            <>
              <label htmlFor="wish-slot" className="sr-only">
                For which piece in your plan
              </label>
              <select
                id="wish-slot"
                name="slot_id"
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
                className="input sm:col-start-1"
              >
                <option value="">Not for a piece in my plan</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    For my {slot.name.toLowerCase()}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <SubmitButton
            pending={store ? 'Saving' : 'Reading the shop'}
            variant="quiet"
            className={`sm:col-start-2 ${slots.length > 0 ? 'sm:row-start-2' : 'sm:row-start-1'}`}
          >
            Add to wishlist
          </SubmitButton>
        </div>
        {linkError ? (
          <p id="wish-link-error" role="alert" className="mt-2 text-sm text-alert">
            {linkError}
          </p>
        ) : null}

        {store ? (
          <ByHand
            store={store}
            values={values}
            errors={errors}
            photo={photo}
            photoPending={photoPending}
            photoMessage={photoState?.ok === false ? photoState.message : undefined}
            kind={kind ?? slotKind}
            onKind={setKind}
            onPhoto={(file) => {
              const form = new FormData()
              form.set('file', file)
              startTransition(() => photoAction(form))
            }}
          />
        ) : null}
      </form>

      {added ? (
        <div key={added.product_id} className="crossfade card mt-5 p-5" aria-live="polite">
          <p className="prose-measure text-ink-2">
            <span className="font-semibold text-ink">{added.title}</span> is on your wishlist. Choose the photo it shows, here and
            when you see it on you, or add your own.
          </p>
          <div className="mt-4">
            <PhotoChoice productId={added.product_id} photos={added.photos} shown={added.shown} />
          </div>
          <button type="button" className="link mt-1 text-sm" onClick={() => setAdded(null)}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The fields for a find from a shop that cannot be read. The photo is stored
 * the moment it is chosen and the form carries only its id, so a mistake in
 * another field never costs the photo.
 */
function ByHand({
  store,
  values,
  errors,
  photo,
  photoPending,
  photoMessage,
  kind,
  onKind,
  onPhoto,
}: {
  store: ManualStore
  values: Record<string, string> | undefined
  errors: Record<string, string>
  photo: FindPhoto | null
  photoPending: boolean
  photoMessage: string | undefined
  kind: string
  onKind: (value: string) => void
  onPhoto: (file: File) => void
}) {
  const photoError = photoMessage ?? (photo ? undefined : errors.photo_id)
  return (
    <div className="crossfade card mt-5 p-5 sm:p-6">
      <p className="prose-measure text-ink-2">
        {store.name}’s site cannot be read, so add this one by hand. Its price is what you enter here, and it is not checked each
        night.
      </p>

      <div className="mt-5 flex items-start gap-4">
        <label
          className={`pressable relative flex aspect-[4/5] w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[var(--radius-tile)] text-center text-xs font-medium text-ink-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent ${photo && !photoPending ? 'bg-photo' : 'shadow-[inset_0_0_0_1px_var(--line-strong)]'} ${photoPending ? 'cursor-progress' : ''}`}
        >
          {/* No name: the photo goes up on its own, and the form carries its id. */}
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={photoPending}
            aria-label={photo ? 'Choose another photo' : 'Choose its photo'}
            aria-invalid={photoError ? true : undefined}
            aria-describedby={photoError ? 'wish-photo-error' : 'wish-photo-hint'}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPhoto(file)
              event.target.value = ''
            }}
          />
          {photoPending ? (
            <>
              <Spinner />
              <span>Adding</span>
            </>
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- her own photo behind the sign-in, already sized
            <img
              src={`/photos/finds/${photo.id}?w=384`}
              alt="Its photo"
              width={photo.width}
              height={photo.height}
              className="absolute inset-0 size-full object-contain p-[6%] mix-blend-multiply"
            />
          ) : (
            <>
              <CameraIcon className="size-6" />
              <span className="px-2">Its photo</span>
            </>
          )}
        </label>
        <div className="min-w-0 pt-1">
          <p id="wish-photo-hint" className="text-sm text-ink-3">
            {photo
              ? 'Tap the photo to use another.'
              : 'On the shop’s page, hold its photo and save it to your photos, then choose it here.'}
          </p>
          {photoError ? (
            <p id="wish-photo-error" role="alert" className="mt-1.5 text-sm text-alert">
              {photoError}
            </p>
          ) : null}
        </div>
      </div>
      <input type="hidden" name="photo_id" value={photo?.id ?? ''} />

      <div className="mt-5 space-y-4">
        <Text
          id="name"
          label="What it is called"
          defaultValue={values?.name}
          error={errors.name}
          placeholder="Align high-rise pant"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="wish-garment_type" className="field-label">
              What it is
            </label>
            <select
              id="wish-garment_type"
              name="garment_type"
              value={kind}
              onChange={(event) => onKind(event.target.value)}
              aria-invalid={errors.garment_type ? true : undefined}
              aria-describedby={errors.garment_type ? 'wish-garment_type-error' : undefined}
              className="input"
            >
              <option value="">Choose</option>
              {GARMENT_GROUPS.map((group) => (
                <optgroup key={group.title} label={group.title}>
                  {group.types.map((type) => (
                    <option key={type} value={type}>
                      {GARMENT_LABELS[type]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.garment_type ? (
              <p id="wish-garment_type-error" role="alert" className="mt-1.5 text-sm text-alert">
                {errors.garment_type}
              </p>
            ) : null}
          </div>
          <Text id="price" label="Price" unit={store.currency} defaultValue={values?.price} error={errors.price} decimal />
          <Text id="colour" label="Colour" defaultValue={values?.colour} error={errors.colour} placeholder="Optional" />
          <Text id="size" label="Your size" defaultValue={values?.size} error={errors.size} placeholder="Optional" />
        </div>
      </div>
    </div>
  )
}

/** A labelled text field with its own error. Ids carry "wish-", as other pages stay in the DOM hidden. */
function Text({
  id,
  label,
  defaultValue,
  error,
  placeholder,
  unit,
  decimal = false,
}: {
  id: string
  label: string
  defaultValue: string | undefined
  error: string | undefined
  placeholder?: string
  unit?: string
  decimal?: boolean
}) {
  const field = `wish-${id}`
  return (
    <div className="min-w-0">
      <label htmlFor={field} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={field}
          name={id}
          type="text"
          inputMode={decimal ? 'decimal' : undefined}
          autoComplete="off"
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${field}-error` : undefined}
          className={`input ${decimal ? 'tabular' : ''} ${unit ? 'pr-14' : ''}`}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-3">{unit}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${field}-error`} role="alert" className="mt-1.5 text-sm text-alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
