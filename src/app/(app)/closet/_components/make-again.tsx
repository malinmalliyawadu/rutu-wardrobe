'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { makeItAgain } from '@/app/actions/try-on'
import { Spinner } from '@/components/ui/form'

/** "Make it again": a new picture of the same thing, which then shows among the try-ons in the making. */
export function MakeAgain({ id }: { id: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div aria-live="polite">
      <button
        type="button"
        className="btn btn-quiet"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await makeItAgain(id)
            if (result.ok) router.push(`/closet/try-ons/${result.id}`)
            else setError(result.message)
          })
        }}
      >
        {pending ? <Spinner /> : null}
        {pending ? 'Asking' : 'Make it again'}
      </button>
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
    </div>
  )
}
