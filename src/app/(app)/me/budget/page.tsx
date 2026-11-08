import { getProfile } from '@/lib/profile'

import { BudgetForm } from '../_components/budget-form'
import { SubPage } from '../_components/sub-page'

export const metadata = { title: 'Budget' }

/** Her ceilings in New Zealand dollars. */
export default function BudgetPage() {
  return (
    <SubPage title="Budget" line="In New Zealand dollars. Leave blank whatever has no ceiling.">
      <Budget />
    </SubPage>
  )
}

async function Budget() {
  const profile = await getProfile()
  return <BudgetForm key={profile.updated_at.getTime()} budget={profile.budget} />
}
