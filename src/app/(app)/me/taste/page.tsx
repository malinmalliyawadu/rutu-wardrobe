import Link from 'next/link'

import { getProfile } from '@/lib/profile'

import { SubPage } from '../_components/sub-page'
import { TasteForm } from '../_components/taste-form'

export const metadata = { title: 'Taste' }

/** Her taste in words. Pictures of outfits she loves go on her board under Style. */
export default function TastePage() {
  return (
    <SubPage
      title="Taste"
      line={
        <>
          In your own words; Claude reads it when it drafts your plan and judges what the shops have. Pictures of outfits
          you love go on{' '}
          <Link href="/style" className="link inline min-h-0">
            your board
          </Link>
          .
        </>
      }
    >
      <Taste />
    </SubPage>
  )
}

async function Taste() {
  const profile = await getProfile()
  return <TasteForm key={profile.updated_at.getTime()} taste={profile.taste} />
}
