import { getProfile } from '@/lib/profile'

import { SizesForm } from '../_components/sizes-form'
import { SubPage } from '../_components/sub-page'

export const metadata = { title: 'Sizes' }

/** Her sizes, measurements and the fit she likes: what the finder and the shops filter by. */
export default function SizesPage() {
  return (
    <SubPage title="Sizes" line="So the shops only bring you what comes in your size. Leave blank whatever you do not know.">
      <Sizes />
    </SubPage>
  )
}

async function Sizes() {
  const profile = await getProfile()
  return (
    <SizesForm
      key={profile.updated_at.getTime()}
      heightCm={profile.height_cm}
      sizes={profile.sizes}
      fits={profile.fit_preferences}
    />
  )
}
