import { connection } from 'next/server'
import { Suspense } from 'react'

import { getGuide } from '@/lib/style-guide'

import { EditPage, FormSkeleton, NoGuide } from '../../_components/edit-page'
import { FitsForm } from '../../_components/guide-forms'

export const metadata = { title: 'Your fits' }

export default function FitsPage() {
  return (
    <EditPage title="Your fits" line="The fit labels that work on you, garment by garment. The shops' other cuts are passed over.">
      <Suspense fallback={<FormSkeleton />}>
        <Loaded />
      </Suspense>
    </EditPage>
  )
}

async function Loaded() {
  await connection()
  const guide = await getGuide()
  if (!guide) return <NoGuide />
  return <FitsForm key={guide.edited_at?.toISOString() ?? 'drafted'} fits={guide.fit_vocabulary} />
}
