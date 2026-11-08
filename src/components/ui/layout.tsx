import Link from 'next/link'
import type { ReactNode } from 'react'

import { BackIcon } from './icons.tsx'

/*
 * The parts every page is made of. A page opens with its name in Bodoni and,
 * under a tab with sections, the row of section chips. Sections inside a page
 * are separated by space and named by a caption, never by a rule.
 */

export function PageHead({
  title,
  line,
  aside,
  children,
}: {
  title: ReactNode
  /** One plain line under the title, only where the page needs it. */
  line?: ReactNode
  /** An action or a count, at the right of the title on the laptop. */
  aside?: ReactNode
  /** The section chips, under the title. */
  children?: ReactNode
}) {
  return (
    <header className="mb-8 lg:mb-12">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="display">{title}</h1>
          {line ? <p className="prose-measure mt-3 text-ink-2">{line}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  )
}

export function Section({
  title,
  aside,
  children,
  className = '',
  id,
}: {
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`mt-14 first:mt-0 lg:mt-20 ${className}`}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="headline">{title}</h2>
        {aside ? <div className="caption shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** The small way back at the top of a page under a section. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href as never} className="pressable -ml-1 mb-4 inline-flex min-h-11 items-center gap-1 pr-2 text-sm font-medium text-ink-2">
      <BackIcon className="size-5" />
      {children}
    </Link>
  )
}

/**
 * An empty place: what to do next, said once, with the one way to do it.
 * Not how it feels.
 */
export function Empty({ title, line, action }: { title: string; line?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card px-6 py-10 sm:px-10 sm:py-14">
      <p className="headline">{title}</p>
      {line ? <p className="prose-measure mt-3 text-ink-2">{line}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

/** A link styled as a button. */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'normal',
  className = '',
  external = false,
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'quiet'
  size?: 'normal' | 'small'
  className?: string
  external?: boolean
}) {
  const classes = `btn ${variant === 'primary' ? 'btn-primary' : 'btn-quiet'} ${size === 'small' ? 'btn-small' : ''} ${className}`
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href as never} className={classes}>
      {children}
    </Link>
  )
}

/** A row in a list that leads somewhere: a title, a line under it, and where it goes. */
export function RowLink({
  href,
  title,
  line,
  aside,
}: {
  href: string
  title: ReactNode
  line?: ReactNode
  aside?: ReactNode
}) {
  return (
    <Link
      href={href as never}
      className="pressable group flex min-h-16 items-center justify-between gap-4 border-b border-line py-4 last:border-b-0"
    >
      <span className="min-w-0">
        <span className="title block">{title}</span>
        {line ? <span className="mt-0.5 block text-sm text-ink-3">{line}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm text-ink-3">
        {aside}
        <BackIcon className="size-5 rotate-180 transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
