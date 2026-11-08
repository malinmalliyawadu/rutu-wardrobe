import { getProfile } from '@/lib/profile'

import { SubPage } from '../_components/sub-page'
import { WeekForm } from '../_components/week-form'

export const metadata = { title: 'Your week' }

/** How her days split, so outfits are dressed for them. */
export default function WeekPage() {
  return (
    <SubPage title="Your week" line="Roughly how your days go, so outfits suit them. Wellington’s weather is already taken care of.">
      <Week />
    </SubPage>
  )
}

async function Week() {
  const profile = await getProfile()
  return <WeekForm key={profile.updated_at.getTime()} life={profile.life} />
}
