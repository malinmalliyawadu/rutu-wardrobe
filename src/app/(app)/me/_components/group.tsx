import type { ReactNode } from 'react'

/**
 * A group of fields in one of the profile's forms: its name in Bodoni, a
 * plain line only where it helps, and space above rather than a rule.
 */
export function Group({ title, line, children }: { title: string; line?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-14 first:mt-0 lg:mt-16">
      <h2 className="headline">{title}</h2>
      {line ? <p className="prose-measure mt-2 text-ink-2">{line}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
