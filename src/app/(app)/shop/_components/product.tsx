import type { Price } from '@/lib/feed'

/*
 * A product's price and sizes, in words, for every find in the Shop tab and
 * in the mirror beside a try-on. No client code, so the server pages and the
 * client cards share them.
 */

export const nzd = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-NZ')}`

const SYMBOLS: Record<string, string> = { GBP: '£', USD: 'US$', AUD: 'A$', EUR: '€' }
const foreign = (cents: number, currency: string) =>
  `${SYMBOLS[currency] ?? `${currency} `}${Math.round(cents / 100).toLocaleString('en-NZ')}`
const COUNTRIES: Record<string, string> = { GB: 'the UK', US: 'the US', AU: 'Australia' }
const countryName = (code: string) => COUNTRIES[code] ?? new Intl.DisplayNames(['en-NZ'], { type: 'region' }).of(code) ?? code

/**
 * The price in New Zealand dollars, with the old price struck through when
 * it is on sale. A foreign shop's price is "about" in NZD, with its own
 * price and what else she would pay under it.
 */
export function PriceLine({ price, className = '' }: { price: Price; className?: string }) {
  if (price.currency !== 'NZD') {
    return (
      <div className={`tabular ${className}`}>
        <p className="font-semibold">About {nzd(price.nzdCents)}</p>
        <p className="caption mt-0.5">
          {price.shipsToNz
            ? `${foreign(price.cents, price.currency)} from ${countryName(price.country)}, plus duty and shipping`
            : `${foreign(price.cents, price.currency)} in ${countryName(price.country)}, and it does not ship here`}
        </p>
      </div>
    )
  }
  return (
    <p className={`tabular ${className}`}>
      <span className="font-semibold">{nzd(price.nzdCents)}</span>
      {price.compareAtNzdCents ? (
        <>
          <span className="sr-only">, was </span>
          <span className="ml-2 text-ink-3 line-through decoration-1">{nzd(price.compareAtNzdCents)}</span>
        </>
      ) : null}
    </p>
  )
}

/** "28 inch Waist x 30 inch Leg" reads as "28/30" on a card. */
function shortSize(label: string): string {
  const waistLeg = /^(\d{2})\s*(?:"|inch(?:es)?|in)?\s*waist\s*x\s*(\d{2})\s*(?:"|inch(?:es)?|in)?\s*leg$/i.exec(label.trim())
  return waistLeg ? `${waistLeg[1]}/${waistLeg[2]}` : label
}

/** The sizes in a line: hers in stock when her size is known, else what the shop has. */
export function sizeLine(find: { sizes: string[]; size_known: boolean; stock_known: boolean }): string | null {
  if (find.sizes.length === 0) return null
  if (find.sizes.length === 1 && /^one size$/i.test(find.sizes[0]!)) return 'One size'
  const sizes = [...new Set(find.sizes.map(shortSize))]
  // A shop whose page gives no stock: these are the sizes it makes, not the ones it has.
  if (!find.stock_known) {
    if (find.size_known) return `Made in your ${sizes.join(', ')}; the shop’s page has the stock`
    const range = sizes.length > 1 ? `Sizes ${sizes[0]} to ${sizes.at(-1)}` : `Size ${sizes[0]}`
    return `${range}; the shop’s page has the stock`
  }
  if (find.size_known) return `Your ${sizes.join(', ')} in stock`
  const shown = sizes.slice(0, 6).join(', ')
  return `In stock in ${shown}${sizes.length > 6 ? ' and more' : ''}`
}

/** Card image sizes: a swipe row on the phone, then 2, 3 and 4 across. */
export const CARD_SIZES = '(min-width: 1280px) 18rem, (min-width: 1024px) 26vw, (min-width: 640px) 45vw, 72vw'
