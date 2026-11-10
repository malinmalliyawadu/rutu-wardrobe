'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'

import { feedAction } from '@/app/actions/feed'
import { seeAskedOutfitOnMe } from '@/app/actions/try-on'
import { FlatLay, type Laid } from '@/components/look/look-picture'
import { TryOn } from '@/components/look/try-on'
import { SubmitButton, Spinner } from '@/components/ui/form'
import { CheckIcon, HeartIcon } from '@/components/ui/icons'
import { PiecePicture, ProductPhoto, type PieceLook } from '@/components/ui/photos'
import type { Idea, OutfitPart, OutfitView, ShopItem } from '@/lib/outfit'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

import { PriceLine, nzd, sizeLine } from '../../shop/_components/product.tsx'
import { search } from '../../shop/ask/actions.ts'

/*
 * An outfit with something from the shops in it, or described in words, as a
 * spread: the outfit in the arch on the left, and beside it its name, why it
 * answers what she asked for, and each piece as a row. A product's row opens
 * the shop's page and saves it to the wishlist; a piece of hers opens the
 * piece; a garment only described is its colour, with a way to ask the shops
 * for it. "See it on me" puts the whole outfit on her; an outfit only
 * described gets that picture with the ask, and the arch fills with it.
 */

function pictured(part: OutfitPart): PieceLook {
  if (part.piece) return part.piece
  if (part.idea) return { name: part.name, colour_hex: part.idea.colour_hex, colour_name: part.idea.colour_name, photo: null, image: null }
  return { name: part.name, colour_hex: null, photo: null, image: part.product.image }
}

export function OutfitSpread({
  outfit,
  occasion,
  asked,
  drawing = false,
}: {
  outfit: OutfitView
  occasion: string
  /** What she asked for, over the name. */
  asked: string
  /** An outfit from anything whose picture of her is still being made. */
  drawing?: boolean
}) {
  const products = outfit.parts.flatMap((part) => (part.product ? [part.product] : []))
  const [saved, setSaved] = useState(() => new Set(products.filter((product) => product.state === 'saved').map((product) => product.product_id)))
  const [failed, setFailed] = useState(false)
  const [, startTransition] = useTransition()

  /** Shown at once and saved behind, one after another; a save that fails is put back. */
  function keep(ids: number[], on: boolean) {
    const before = saved
    const next = new Set(saved)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    setSaved(next)
    setFailed(false)
    startTransition(async () => {
      for (const id of ids) {
        const result = await feedAction({ action: on ? 'saved' : 'cleared', product_id: id, slot_id: null })
        if (!result.ok) {
          setSaved(before)
          setFailed(true)
          return
        }
      }
    })
  }

  const title = outfit.title ?? 'The outfit'
  const laid: Laid = {
    title,
    pieces: outfit.parts.map((part) => ({ ...pictured(part), id: part.key, garment_type: part.garment_type })),
  }
  const buyable = products.filter((product) => product.state !== 'bought' && !product.gone)
  const unsaved = buyable.filter((product) => !saved.has(product.product_id))
  const described = outfit.parts.some((part) => part.idea)
  // An outfit only described leads with the picture of her in it, once there is one.
  const picture = described && outfit.on_me?.status === 'ready' ? outfit.on_me : null
  const own = outfit.parts.filter((part) => part.piece).length
  const unseen = outfit.parts.filter((part) => part.piece && !part.piece.photo && !part.piece.image).length

  return (
    <article aria-label={title} className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <div className="lg:sticky lg:top-6">
        <figure>
          {picture ? (
            <div className="arch" style={{ aspectRatio: `${picture.width ?? 3} / ${picture.height ?? 4}` }}>
              {/* A private, already-sized file behind the sign-in; the optimiser would only copy it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/photos/try-ons/${picture.id}`}
                alt={`You wearing ${title.toLowerCase()}`}
                width={picture.width ?? 3}
                height={picture.height ?? 4}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          ) : (
            <div className="arch aspect-[4/5]">
              <FlatLay look={laid} sizes="(min-width: 1024px) 34rem, 100vw" />
            </div>
          )}
          {picture ? (
            <figcaption className="caption mt-3">Drawn from your photo and the words for each piece, not from real garments.</figcaption>
          ) : drawing ? (
            <figcaption className="caption mt-3 flex items-center gap-2" aria-live="polite">
              <Spinner className="size-4 text-accent" />
              Putting it on you. About a minute.
            </figcaption>
          ) : null}
        </figure>
      </div>

      <div className="min-w-0 lg:pt-10">
        <p className="caption">{asked}</p>
        <h1 className="display mt-3">{title}</h1>
        <p className="caption mt-4">
          {occasion}
          {outfit.weather ? `, ${outfit.weather.toLowerCase()}` : ''}
        </p>
        {outfit.why ? <p className="prose-measure mt-4 text-lg">{outfit.why}</p> : null}
        {outfit.styling ? <p className="voice prose-measure mt-5">{outfit.styling}</p> : null}

        <ul className="prose-measure mt-8 border-t border-line" aria-label="What it is made of">
          {outfit.parts.map((part) =>
            part.product ? (
              <ProductRow
                key={part.key}
                product={part.product}
                saved={saved.has(part.product.product_id)}
                onKeep={(on) => keep([part.product.product_id], on)}
              />
            ) : part.idea ? (
              <IdeaRow key={part.key} idea={part.idea} />
            ) : (
              <li key={part.key} className="border-b border-line">
                <Link href={`/closet/${part.piece.id}`} className="pressable flex items-center gap-4 py-4">
                  <PiecePicture piece={part.piece} label={GARMENT_LABELS[part.garment_type]} sizes="4rem" className="aspect-[3/4] w-16 shrink-0" />
                  <span className="min-w-0">
                    <span className="caption block">Yours</span>
                    <span className="title mt-0.5 block">{part.piece.name}</span>
                  </span>
                </Link>
              </li>
            ),
          )}
        </ul>

        {buyable.length > 0 ? (
          <div className="prose-measure mt-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <p className="tabular">
                <span className="font-semibold">About {nzd(outfit.to_buy_cents)}</span>
                <span className="text-ink-2">
                  {' '}
                  for {buyable.length === 1 ? 'the one piece' : `the ${buyable.length} pieces`} to buy
                  {own > 0 ? `, with ${own === 1 ? 'one' : own} of yours` : ''}
                </span>
              </p>
              {unsaved.length > 1 ? (
                <button type="button" className="link text-sm" onClick={() => keep(unsaved.map((product) => product.product_id), true)}>
                  Save all to your wishlist
                </button>
              ) : null}
            </div>
            <p className="caption mt-1">Prices and sizes as the finder last read them. The shop’s page has today’s.</p>
          </div>
        ) : null}
        {described ? (
          <p className="caption prose-measure mt-5">
            Described, not found: no shop was read for these. Ask the shops for one and Claude judges what they have, at the cost of an ask.
          </p>
        ) : null}
        {failed ? (
          <p role="alert" className="mt-2 text-sm text-alert">
            That did not save. Try again.
          </p>
        ) : null}

        {/* Its picture is about to start on its own: nothing to tap yet. */}
        <div className="mt-6" hidden={drawing && !outfit.on_me}>
          <TryOn
            key={outfit.on_me ? `${outfit.on_me.id}-${outfit.on_me.status}` : 'none'}
            initial={outfit.on_me}
            start={(again) => seeAskedOutfitOnMe(outfit.id, again)}
            content={{
              over: occasion,
              title,
              alt: `You wearing ${title.toLowerCase()}`,
              aside: (
                <figure>
                  <div className="grid grid-cols-3 gap-2">
                    {outfit.parts.map((part) => (
                      <PiecePicture key={part.key} piece={pictured(part)} label={GARMENT_LABELS[part.garment_type]} sizes="7rem" className="aspect-[3/4]" />
                    ))}
                  </div>
                  <figcaption className="caption mt-2">What it is made from</figcaption>
                </figure>
              ),
              note: described ? (
                <>
                  Made by OpenAI from your full-length photo and the words for each piece. No real garment was shown, so read it for the idea: the colours together, the proportions, the level of dress.
                </>
              ) : (
                <>
                  Made by OpenAI from your full-length photo{own > 0 ? ', the photos of your pieces' : ''} and the shops’ photos. Judge the colours against the clothes themselves: the picture cannot know how each one sits on you.
                  {unseen > 0
                    ? ` ${unseen === 1 ? 'One piece of yours has' : `${unseen} pieces of yours have`} no photo yet, so ${unseen === 1 ? 'it was' : 'they were'} drawn from the description.`
                    : null}
                </>
              ),
            }}
          />
        </div>
      </div>
    </article>
  )
}

/** A product of the outfit: the shop's photo and page, why this one, its price in her size, and Save. */
function ProductRow({ product, saved, onKeep }: { product: ShopItem; saved: boolean; onKeep: (on: boolean) => void }) {
  const sizes = sizeLine(product)
  return (
    <li className="flex gap-4 border-b border-line py-4">
      <a href={product.url} target="_blank" rel="noopener noreferrer" className="pressable block shrink-0 self-start">
        <ProductPhoto image={product.image} title={product.title} sizes="4rem" className="aspect-[4/5] w-16" />
      </a>
      <div className="min-w-0 flex-1">
        <p className="caption truncate">{product.retailer}</p>
        <a href={product.url} target="_blank" rel="noopener noreferrer" className="title pressable mt-0.5 block">
          {product.title}
        </a>
        {product.why ? <p className="voice mt-1 text-[1.0625rem]">{product.why}</p> : null}
        {product.gone ? (
          <p className="mt-2 text-sm text-ink-3">The shop no longer lists it.</p>
        ) : (
          <>
            <PriceLine price={product.price} className="mt-2" />
            {sizes ? <p className="caption mt-0.5">{sizes}</p> : null}
          </>
        )}
        <div className="mt-3">
          {product.state === 'bought' ? (
            <p className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <CheckIcon className="size-[1.125rem] text-accent" />
              Bought
            </p>
          ) : product.gone ? null : (
            <button type="button" aria-pressed={saved} aria-label={saved ? `Saved ${product.title}` : `Save ${product.title}`} className="btn btn-quiet btn-small" onClick={() => onKeep(!saved)}>
              <HeartIcon filled={saved} className={`size-[1.125rem] ${saved ? 'text-accent' : ''}`} />
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

/** A garment described, not found: its colour, what it is, and a way to ask the shops for it. */
function IdeaRow({ idea }: { idea: Idea }) {
  const [state, action] = useActionState(search, null)
  // "Gold, gold" says nothing twice: jewellery's colour is often its material.
  const made = [...new Set([idea.colour_name, idea.fabric, idea.fit].filter(Boolean).map((word) => word!.trim()))].join(', ')
  return (
    <li className="flex gap-4 border-b border-line py-4">
      <PiecePicture
        piece={{ name: idea.name, colour_hex: idea.colour_hex, colour_name: idea.colour_name, photo: null, image: null }}
        sizes="4rem"
        className="aspect-[3/4] w-16 shrink-0 self-start"
      />
      <div className="min-w-0 flex-1">
        <p className="caption">{GARMENT_LABELS[idea.garment_type]}</p>
        <p className="title mt-0.5">{idea.name}</p>
        {made ? <p className="caption mt-0.5">{made}</p> : null}
        <p className="voice mt-1 text-[1.0625rem]">{idea.why}</p>
        <form action={action} className="mt-3">
          <input type="hidden" name="request" value={idea.search} />
          <SubmitButton variant="quiet" size="small" pending="Starting">
            Ask the shops
          </SubmitButton>
        </form>
        {state?.errors?.request ? (
          <p role="alert" className="mt-2 text-sm text-alert">
            {state.errors.request}
          </p>
        ) : null}
      </div>
    </li>
  )
}
