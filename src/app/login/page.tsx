import { safeNext } from '@/lib/auth'

import { SignInForm } from './form'

export const metadata = { title: 'Sign in' }

/**
 * The one door: a password, in the mirror. The only page with nothing else
 * on it, and the only one centred.
 */
export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams
  return (
    <main className="grid min-h-dvh place-items-center px-[var(--gutter)] py-12">
      <div className="w-full max-w-sm text-center">
        <div aria-hidden className="arch mx-auto aspect-[4/5] w-36 bg-surface">
          <div className="absolute inset-[9%] rounded-[var(--radius-arch)] shadow-[inset_0_0_0_1px_var(--line-strong)]" />
        </div>
        <h1 className="mt-8 font-serif text-5xl italic tracking-[-0.02em]">Rutu</h1>
        <SignInForm next={safeNext(typeof next === 'string' ? next : '/')} />
      </div>
    </main>
  )
}
