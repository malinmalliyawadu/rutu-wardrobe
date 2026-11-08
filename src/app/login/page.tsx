import type { Metadata } from 'next'
import { Suspense } from 'react'

import { safeNext } from '@/lib/auth'

import { SignInForm } from './form'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * The one door: a password, under an empty mirror. The one page a stranger
 * can reach, so it names no one: no wordmark, no palette, no profile. The
 * shell prerenders; only where to go after signing in comes from the request.
 * The only page with nothing else on it, and the only one centred.
 */
export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="grid min-h-dvh place-items-center px-[var(--gutter)] pt-[env(safe-area-inset-top)] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm text-center">
        <div aria-hidden className="arch mx-auto aspect-[4/5] w-32 bg-surface">
          <div className="absolute inset-[9%] rounded-[var(--radius-arch)] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
        </div>
        <h1 className="mt-8 font-serif text-[2.75rem] leading-none italic tracking-[-0.02em]">Dressing room</h1>
        <Suspense fallback={<SignInForm next="/" />}>
          <WithNext searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function WithNext({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const { next } = await searchParams
  return <SignInForm next={safeNext(typeof next === 'string' ? next : null)} />
}
