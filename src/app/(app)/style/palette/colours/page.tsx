import { connection } from 'next/server'
import { Suspense } from 'react'

import { getGuide } from '@/lib/style-guide'

import { EditPage, FormSkeleton, NoGuide } from '../../_components/edit-page'
import { PaletteForm } from '../../_components/guide-forms'

export const metadata = { title: 'Your colours' }

export default function ColoursPage() {
  return (
    <EditPage title="Your colours" line="Your plan takes its colours from here, and the shops are checked against them.">
      <Suspense fallback={<FormSkeleton rows={4} />}>
        <Loaded />
      </Suspense>
    </EditPage>
  )
}

async function Loaded() {
  await connection()
  const guide = await getGuide()
  if (!guide) return <NoGuide />
  return <PaletteForm key={guide.edited_at?.toISOString() ?? 'drafted'} palette={guide.palette} />
}
