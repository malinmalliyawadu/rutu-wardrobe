import { connection } from 'next/server'

import { checkAll } from '@/lib/health'

/*
 * Whether the app's three dependencies answer: the database, Claude and the
 * photo store. Streams in on its own under Suspense, so a slow Claude never
 * holds up her profile. A failure is said in plain words, in the alert colour.
 */

const NAMES: Record<string, string> = {
  Database: 'Database',
  Claude: 'Claude',
  Photos: 'Photo store',
}

export async function Health() {
  await connection()
  const checks = await checkAll()
  return (
    <>
      <p className="caption mt-10">Health, checked as the page opened</p>
      <ul aria-label="Health" className="mt-1">
        {checks.map((check) => (
          <li
            key={check.name}
            className="flex min-h-16 items-center justify-between gap-4 border-b border-line py-4 last:border-b-0"
          >
            <span className="min-w-0">
              <span className="title block">{NAMES[check.name] ?? check.name}</span>
              <span className={`mt-0.5 block text-sm break-words ${check.ok ? 'text-ink-3' : 'text-alert'}`}>
                {check.detail}
              </span>
            </span>
            <span
              className={`flex shrink-0 items-center gap-2 text-sm tabular ${check.ok ? 'text-ink-3' : 'text-alert'}`}
            >
              <span aria-hidden className={`size-2 rounded-full ${check.ok ? 'bg-accent' : 'bg-alert'}`} />
              {check.ok ? `${check.latencyMs} ms` : 'Not answering'}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function HealthSkeleton() {
  return (
    <>
      <p className="caption mt-10">Health, checked as the page opened</p>
      <ul aria-hidden className="mt-1">
        {Object.values(NAMES).map((name, index) => (
          <li key={name} className="flex min-h-16 items-center border-b border-line py-4 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="title block">{name}</span>
              <span className={`skeleton delayed mt-1.5 block h-3.5 ${['w-48', 'w-36', 'w-56'][index]}`} />
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
