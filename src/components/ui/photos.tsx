'use client'

import Image, { type ImageLoader } from 'next/image'
import type { CSSProperties } from 'react'

import type { ProductImage } from '@/lib/finder/shopify'
import type { PiecePhoto } from '@/lib/pieces'
import { productImageAt } from '@/lib/product-image'

/*
 * Pictures of garments. A shop's photo sits whole on the white sweep; her own
 * photo of a piece fills its tile; a piece with neither is its colour, named
 * under the mouse like any swatch. The caller sets the box (aspect and
 * radius) through className. Client modules because next/image takes the
 * loader as a function.
 */

/** The shops' image hosts resize on their own, so the image optimiser is not needed. */
export const productLoader: ImageLoader = ({ src, width }) => productImageAt(src, width)

export function ProductPhoto({
  image,
  title,
  sizes,
  className = '',
  priority = false,
}: {
  image: ProductImage | null
  title: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <div className={`sweep ${className}`}>
      {image ? (
        <Image
          loader={productLoader}
          src={image.src}
          alt={image.alt ?? title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-[6%]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-sm text-ink-3">No photo</span>
      )}
    </div>
  )
}

export type PieceLook = {
  name: string
  colour_hex: string | null
  colour_name?: string | null
  photo: PiecePhoto | null
  image: ProductImage | null
}

export function PiecePicture({
  piece,
  sizes,
  className = '',
  thumb = true,
  label,
}: {
  piece: PieceLook
  sizes: string
  className?: string
  thumb?: boolean
  /** Shown on the colour when there is no photo, where nothing else says what the piece is. */
  label?: string
}) {
  if (piece.photo) {
    return (
      <div className={`relative overflow-hidden rounded-[var(--radius-tile)] bg-photo ${className}`}>
        {/* Her own photo, served and sized by /photos/wardrobe; the optimiser cannot reach it behind the sign-in. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/photos/wardrobe/${piece.photo.id}${thumb ? '?v=thumb' : ''}`}
          alt={piece.name}
          width={piece.photo.width}
          height={piece.photo.height}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    )
  }
  if (piece.image) return <ProductPhoto image={piece.image} title={piece.name} sizes={sizes} className={className} />
  return (
    <div
      role="img"
      aria-label={piece.name}
      data-colour={(piece.colour_hex && piece.colour_name) || undefined}
      className={`swatch relative overflow-hidden rounded-[var(--radius-tile)] ${className}`}
      style={{ '--swatch': piece.colour_hex ?? 'var(--surface)' } as CSSProperties}
    >
      {label ? (
        <span
          aria-hidden
          className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-ground/85 px-2 py-0.5 text-xs font-medium text-ink-2"
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}
