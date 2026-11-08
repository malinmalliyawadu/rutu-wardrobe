import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { listSlots, sentenceCase } from '@/lib/blueprint'
import { getProfile } from '@/lib/profile'
import { getSearch } from '@/lib/search'
import { getGuide } from '@/lib/style-guide'

import { FormSkeleton } from '../../_components/edit-page'
import { SlotForm } from '../../_components/slot-form'
import { ceilings, formValues, paletteSwatches } from '../../_components/slot-values'

export const metadata = { title: 'Add a piece' }

export default function NewSlotPage({ searchParams }: PageProps<'/style/plan/new'>) {
  return (
    <>
      <BackLink href="/style/plan">Plan</BackLink>
      <PageHead
        title="Add a piece"
        line="Something you want that the draft left out, or something you own that the plan should build around. A new draft keeps it."
      />
      <Suspense fallback={<FormSkeleton rows={5} />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Form({ searchParams }: Pick<PageProps<'/style/plan/new'>, 'searchParams'>) {
  await connection()
  const [profile, guide, slots, params] = await Promise.all([getProfile(), getGuide(), listSlots(), searchParams])
  // From an ask's "Add to my plan": the piece starts as what she asked the shops for.
  const searchId = Number(typeof params.search === 'string' ? params.search : NaN)
  const search = Number.isInteger(searchId) && searchId > 0 ? await getSearch(searchId) : null
  const initial = formValues(null)
  if (search?.target) {
    const target = search.target
    // "A rust midi skirt under $200" names the piece "Rust midi skirt"; the price goes in what to spend.
    initial.name = sentenceCase(
      (search.summary ?? search.request).replace(/\s+(under|below|up to|around|about|for|from)\s+\$.*$/i, '').replace(/^(an?|some)\s+/i, ''),
    )
    initial.why = `You asked the shops for it: "${search.request}".`
    initial.garment_type = target.garment_type
    initial.colour_family = target.colours.join(', ')
    // The palette colours her words name ("rust" is her "burnt rust"), up to the form's three.
    const palette = guide ? [...guide.palette.best, ...guide.palette.neutrals] : []
    initial.colours = palette
      .filter((colour) => target.colours.some((word) => colour.name.toLowerCase().split(/\s+/).includes(word)))
      .map((colour) => colour.hex)
      .slice(0, 3)
    initial.fabrics = target.fabrics.join(', ')
    initial.fit = target.fit ?? ''
    initial.budget_min = target.min_cents === null ? null : Math.round(target.min_cents / 100)
    initial.budget_max = target.max_cents === null ? null : Math.round(target.max_cents / 100)
  }
  // Keyed on the count, so coming back after adding one starts a fresh form.
  return <SlotForm key={`${slots.length}-${search?.id ?? 'blank'}`} initial={initial} {...paletteSwatches(guide)} ceilings={ceilings(profile)} />
}
