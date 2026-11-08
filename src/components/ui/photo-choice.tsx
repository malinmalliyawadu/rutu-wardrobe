'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'

import { addOwnPhoto, choosePhoto } from '@/app/actions/feed'
import { Spinner } from './form.tsx'
import { PlusIcon } from './icons.tsx'
import { productLoader } from './photos.tsx'
import type { ProductImage } from '@/lib/finder/shopify'

/*
 * The photo a find or a piece from a shop link shows, chosen from a row of
 * the shop's photos, or her own added at the end (src/lib/product-photos.ts).
 * A tap chooses at once and the server follows; a choice it refuses goes back
 * to the one before. The row swipes on the phone and wraps on the laptop.
 * Used where a link is pasted (wishlist, a new piece) and on a wishlist find.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

export function PhotoChoice({
  productId,
  photos,
  shown,
  label = 'The photo it shows',
}: {
  productId: number
  photos: ProductImage[]
  shown: string | null
  label?: string
}) {
  const [selected, setSelected] = useState(shown)
  const [own, setOwn] = useState<ProductImage[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, startUpload] = useTransition()
  const [, startChoice] = useTransition()
  // Only the latest tap may undo itself, so a slow answer to an earlier one never wins.
  const latest = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)

  // The photo it shows may be far along a row that scrolls, so the row opens on it.
  useEffect(() => {
    const row = rowRef.current
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !active || row.scrollWidth <= row.clientWidth) return
    row.scrollLeft = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2
  }, [])

  const row = [...photos, ...own.filter((photo) => !photos.some((shop) => shop.src === photo.src))]

  function choose(src: string) {
    if (src === selected) return
    const before = selected
    const tap = ++latest.current
    setSelected(src)
    setMessage(null)
    startChoice(async () => {
      const result = await choosePhoto({ product_id: productId, src })
      if (!result.ok && tap === latest.current) {
        setSelected(before)
        setMessage(result.message)
      }
    })
  }

  function upload(file: File) {
    const form = new FormData()
    form.set('product_id', String(productId))
    form.set('file', file)
    setMessage(null)
    const tap = ++latest.current
    startUpload(async () => {
      const result = await addOwnPhoto(form)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setOwn((current) => [...current.filter((photo) => photo.src !== result.shown.src), result.shown])
      if (tap === latest.current) setSelected(result.shown.src)
    })
  }

  return (
    <div>
      <div
        ref={rowRef}
        role="group"
        aria-label={label}
        className="-mx-[var(--gutter)] flex gap-2.5 overflow-x-auto px-[var(--gutter)] py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {row.map((photo, index) => {
          const isOwn = photo.src.startsWith('/photos/finds/')
          const active = photo.src === selected
          return (
            <button
              key={photo.src}
              type="button"
              aria-pressed={active}
              aria-label={isOwn ? 'Your photo' : `The shop’s photo ${index + 1} of ${photos.length}`}
              onClick={() => choose(photo.src)}
              className={`sweep pressable aspect-[4/5] w-[4.75rem] shrink-0 transition-shadow duration-150 ${active ? 'ring-2 ring-accent ring-offset-2 ring-offset-ground' : ''} ${own.includes(photo) ? 'tile-enter' : ''}`}
            >
              <Image loader={productLoader} src={photo.src} alt="" fill sizes="5rem" className="object-contain p-[6%]" />
            </button>
          )
        })}
        <label
          className={`pressable flex aspect-[4/5] w-[4.75rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-tile)] bg-raised text-center text-xs font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${uploading ? 'cursor-progress' : ''}`}
        >
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={uploading}
            aria-label="Add your own photo"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) upload(file)
              event.target.value = ''
            }}
          />
          {uploading ? <Spinner /> : <PlusIcon className="size-5" />}
          <span>{uploading ? 'Adding' : 'Your own'}</span>
        </label>
      </div>
      {message ? (
        <p role="alert" className="mt-2 text-sm text-alert">
          {message}
        </p>
      ) : null}
    </div>
  )
}
