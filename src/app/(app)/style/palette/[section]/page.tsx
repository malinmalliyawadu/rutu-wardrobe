import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { BackLink, PageHead } from '@/components/ui/layout'
import { Block } from '@/components/ui/skeleton'
import { RULE_SECTIONS, getGuide, isRuleSection, type RuleSectionName } from '@/lib/style-guide'

import { FormSkeleton, NoGuide } from '../../_components/edit-page'
import { SectionForm } from '../../_components/guide-forms'
import { SECTION_INTROS, SECTION_TITLES } from '../../_components/guide-titles'

export function generateStaticParams() {
  return RULE_SECTIONS.map((section) => ({ section }))
}

export async function generateMetadata({ params }: PageProps<'/style/palette/[section]'>): Promise<Metadata> {
  const { section } = await params
  return { title: isRuleSection(section) ? SECTION_TITLES[section] : 'Palette' }
}

/** One part of the guide's rules: shape and proportion, shoes, or jewellery and accessories. */
export default function SectionPage({ params }: PageProps<'/style/palette/[section]'>) {
  return (
    <>
      <BackLink href="/style/palette">Palette</BackLink>
      <Suspense
        fallback={
          <div aria-hidden>
            <Block className="mb-8 h-16 w-2/3 max-w-md lg:mb-12" />
            <FormSkeleton />
          </div>
        }
      >
        <Head params={params} />
      </Suspense>
    </>
  )
}

/** The part comes from the URL, so its name streams with it. */
async function Head({ params }: Pick<PageProps<'/style/palette/[section]'>, 'params'>) {
  const { section } = await params
  if (!isRuleSection(section)) notFound()
  return (
    <>
      <PageHead title={SECTION_TITLES[section]} line={SECTION_INTROS[section]} />
      <Suspense fallback={<FormSkeleton />}>
        <Loaded section={section} />
      </Suspense>
    </>
  )
}

async function Loaded({ section }: { section: RuleSectionName }) {
  await connection()
  const guide = await getGuide()
  if (!guide) return <NoGuide />
  return <SectionForm key={guide.edited_at?.toISOString() ?? 'drafted'} name={section} section={guide[section]} />
}
