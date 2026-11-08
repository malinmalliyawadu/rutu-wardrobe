import { Block } from '@/components/ui/skeleton'

/** A form's shape while the profile is read: groups of labelled fields, then the button. */
export function FormSkeleton({ groups = 2, fields = 4 }: { groups?: number; fields?: number }) {
  return (
    <div aria-hidden className="max-w-2xl">
      {Array.from({ length: groups }, (_, group) => (
        <div key={group} className={group === 0 ? '' : 'mt-14 lg:mt-16'}>
          <Block className="h-8 w-48" />
          <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {Array.from({ length: fields }, (_, field) => (
              <div key={field}>
                <Block className="h-4 w-24" />
                <Block className="mt-2 h-12 rounded-[var(--radius-control)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Block className="mt-14 h-12 w-40 rounded-[var(--radius-control)]" />
    </div>
  )
}
