'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ui/form'

import { signIn } from './actions'

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null)
  const error = state?.errors?.password
  return (
    <form action={action} className="mt-8 grid gap-3 text-left">
      <input type="hidden" name="next" value={next} />
      {/* A username nobody sees, so a password manager files the entry under something. */}
      <input type="text" name="username" autoComplete="username" defaultValue="rutu" hidden readOnly />
      <label htmlFor="password" className="field-label">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'password-error' : undefined}
        className="input"
      />
      {/* Always there, so a wrong password does not shift the form. */}
      <p id="password-error" role="alert" className="min-h-5 text-sm text-alert">
        {error}
      </p>
      <SubmitButton pending="Signing in" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  )
}
