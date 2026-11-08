'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Field, FormMessage, Spinner, SubmitButton, TextInput, withEcho } from '@/components/ui/form'
import { CameraIcon } from '@/components/ui/icons'
import type { OpenSlot, PieceDraft } from '@/lib/pieces'

import { draftFromLink, draftFromPhoto, type DraftState } from '../actions.ts'
import { Pending } from './pending.tsx'
import { PhotoChoice } from '@/components/ui/photo-choice'
import { PieceForm } from './piece-form.tsx'
import { formValues, type Swatch } from './piece-values.ts'

/*
 * Three ways in, one form out. A photo is read (its colour here, the rest by
 * Claude) and a link by the shop, and either fills the form she then checks
 * and saves; typing starts it blank. The form opens in place under the way
 * in, with a short crossfade.
 */

type Mode = 'photo' | 'link' | 'typed'

const MODES: { value: Mode; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'link', label: 'Shop link' },
  { value: 'typed', label: 'Type it in' },
]

const TYPED: PieceDraft = { source: 'typed', photo_id: null, product_id: null, values: {}, preview: null, note: null }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

export function AddPiece({ best, neutrals, slots }: { best: Swatch[]; neutrals: Swatch[]; slots: OpenSlot[] }) {
  const [mode, setMode] = useState<Mode>('photo')
  // The step crossfades when she switches, never on the page's first paint.
  const [switched, setSwitched] = useState(false)
  const [photoState, photoAction] = useActionState(draftFromPhoto, null)
  const [linkState, linkAction] = useActionState(draftFromLink, null)
  const draft = mode === 'photo' ? photoState?.draft : mode === 'link' ? linkState?.draft : TYPED

  return (
    <div className="max-w-2xl">
      <div role="group" aria-label="How to add it" className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            onClick={() => {
              setMode(item.value)
              setSwitched(true)
            }}
            className="chip"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div key={mode} className={`mt-8 ${switched ? 'crossfade' : ''}`}>
        {mode === 'photo' ? <PhotoStep state={photoState} action={photoAction} draft={draft ?? null} /> : null}
        {mode === 'link' ? <LinkStep state={linkState} action={linkAction} draft={draft ?? null} /> : null}
        {mode === 'typed' ? (
          <p className="prose-measure text-ink-2">No photo to hand? Name it and say what it is, and add a photo from its page later.</p>
        ) : null}
      </div>

      {draft ? (
        <section
          key={`${draft.source}-${draft.photo_id ?? ''}-${draft.product_id ?? ''}`}
          aria-labelledby="piece-form"
          className="crossfade mt-14"
        >
          <h2 id="piece-form" className="headline">
            {draft.source === 'typed' ? 'The piece' : 'Check what was read'}
          </h2>
          {draft.note ? <p className="prose-measure mt-2 text-ink-2">{draft.note}</p> : null}
          <div className="mt-7">
            <PieceForm
              origin={{ source: draft.source, photo_id: draft.photo_id, product_id: draft.product_id }}
              initial={formValues(draft.values)}
              best={best}
              neutrals={neutrals}
              slots={slots}
              submitLabel="Add to your closet"
              another
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}

function PhotoStep({ state, action, draft }: { state: DraftState; action: (form: FormData) => void; draft: PieceDraft | null }) {
  return (
    <div>
      <form action={action} className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <PhotoTile draft={draft} />
        <div className="max-w-sm space-y-3 sm:pb-1">
          <p className="text-ink-2">
            Lay it flat or hang it up, in daylight if you can. Claude reads the photo once to fill in the form, and you check it.
          </p>
          <Pending>Claude is reading the photo. About ten seconds.</Pending>
        </div>
      </form>
      {/* On a phone the tile opens the camera; this is the way to the photo library. */}
      <form action={action} className="mt-2 hidden pointer-coarse:block">
        <LibraryButton />
      </form>
      {state?.message ? (
        <div className="mt-3">
          <FormMessage message={state.message} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The photo as a tile: on a phone a tap opens the back camera, on a laptop
 * the file picker, and the photo is read as soon as it is chosen. Once read,
 * the tile shows it, and a tap takes another.
 */
function PhotoTile({ draft }: { draft: PieceDraft | null }) {
  const { pending } = useFormStatus()
  const photo = draft?.preview && 'photo' in draft.preview ? draft.preview.photo : null
  return (
    <label
      className={`pressable relative flex aspect-[3/4] w-44 shrink-0 cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-tile)] bg-raised text-sm font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-accent sm:w-48 ${pending ? 'cursor-progress' : ''}`}
    >
      <input
        type="file"
        name="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          if (event.target.files?.length) event.target.form?.requestSubmit()
        }}
      />
      {photo && !pending ? (
        <>
          {/* Her own photo, served and sized by /photos/wardrobe. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/photos/wardrobe/${photo.id}?v=thumb`}
            alt="Your photo"
            width={photo.width}
            height={photo.height}
            className="absolute inset-0 size-full object-cover"
          />
          <span className="absolute inset-x-2 bottom-2 rounded-[0.625rem] bg-ground/90 px-3 py-2 text-center text-[0.8125rem] text-ink">
            <span className="pointer-coarse:hidden">Use another</span>
            <span className="hidden pointer-coarse:inline">Take another</span>
          </span>
        </>
      ) : pending ? (
        <>
          <Spinner className="size-5 text-accent" />
          <span>Reading</span>
        </>
      ) : (
        <>
          <CameraIcon className="size-7 text-ink-3" />
          <span className="pointer-coarse:hidden">Choose a photo</span>
          <span className="hidden pointer-coarse:inline">Take a photo</span>
        </>
      )}
    </label>
  )
}

function LibraryButton() {
  const { pending } = useFormStatus()
  return (
    <>
      <label className={`link cursor-pointer gap-2 ${pending ? 'cursor-progress' : ''}`}>
        <input
          type="file"
          name="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            if (event.target.files?.length) event.target.form?.requestSubmit()
          }}
        />
        {pending ? (
          <>
            <Spinner />
            Reading
          </>
        ) : (
          'Or choose one from your photos'
        )}
      </label>
      <Pending>Claude is reading the photo. About ten seconds.</Pending>
    </>
  )
}

function LinkStep({ state, action, draft }: { state: DraftState; action: (form: FormData) => void; draft: PieceDraft | null }) {
  const v = withEcho({ link: '' }, state?.values)
  const image = draft?.preview && 'image' in draft.preview ? draft.preview : null
  return (
    <div>
      <form action={action} className="space-y-4" key={state?.values ? JSON.stringify(state.values) : 'blank'}>
        <Field
          label="Product link"
          name="link"
          error={state?.errors?.link}
          hint="Bought it from one of the shops? Paste its page and the photo and details come with it."
        >
          <TextInput name="link" type="url" defaultValue={v.link} error={state?.errors?.link} placeholder="https://" />
        </Field>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SubmitButton pending="Reading the shop" variant={draft ? 'quiet' : 'primary'}>
            Read the link
          </SubmitButton>
          <Pending>Reading the shop’s page. A few seconds.</Pending>
        </div>
      </form>
      {image && draft?.product_id ? (
        <div className="mt-8">
          <p className="title">{image.title}</p>
          <p className="mt-1 text-sm text-ink-2">Choose the photo it shows in your closet, or add your own.</p>
          <div className="mt-4">
            <PhotoChoice
              key={draft.product_id}
              productId={draft.product_id}
              photos={image.photos}
              shown={image.image.src}
              label="The photo it shows"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
