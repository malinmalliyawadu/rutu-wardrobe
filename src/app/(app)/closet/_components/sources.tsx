import { PiecePicture } from '@/components/ui/photos'
import type { Source, Subject } from '@/lib/on-me'
import { GARMENT_LABELS } from '@/lib/wardrobe-values'

/** The small line over a picture's name: what it was made from. */
export function eyebrow(subject: Subject): string {
  switch (subject.kind) {
    case 'find':
      return subject.retailer ? `A find from ${subject.retailer}` : 'A find'
    case 'look':
      return subject.occasion ? `A look, ${subject.occasion.toLowerCase()}` : 'A look'
    case 'outfit':
      return subject.count === 1 ? 'Your choice' : `Your choice of ${subject.count} pieces`
    case 'described':
      return 'An outfit from anything'
  }
}

/** A picture's sources in miniature, under its tile: up to four, then how many more. */
export function SourceStrip({ sources }: { sources: Source[] }) {
  const shown = sources.slice(0, 4)
  const more = sources.length - shown.length
  return (
    <span className="flex items-center gap-1.5" aria-label={`Made from ${sources.map((source) => source.name).join(', ')}`} role="img">
      {shown.map((source) => (
        <PiecePicture key={source.key} piece={source} sizes="2rem" className="block h-10 w-[1.875rem] shrink-0 rounded-[0.4375rem]" />
      ))}
      {more > 0 ? <span className="tabular pl-0.5 text-[0.8125rem] text-ink-3">+{more}</span> : null}
    </span>
  )
}

/** How a source reached OpenAI, in words for the picture's own page. */
export function shownLine(source: Source): string {
  const whose = source.kind === 'piece' ? 'Yours' : source.kind === 'saved' ? 'Saved find' : source.kind === 'described' ? 'Described' : 'Find'
  const garment = source.garment_type ? GARMENT_LABELS[source.garment_type].toLowerCase() : null
  const how =
    source.shown === 'photo'
      ? 'from your photo of it'
      : source.shown === 'product'
        ? 'from the shop’s photo'
        : source.colour_name
          ? `from its description, ${source.colour_name}`
          : 'from its description'
  return [whose, garment, how].filter(Boolean).join(', ')
}
