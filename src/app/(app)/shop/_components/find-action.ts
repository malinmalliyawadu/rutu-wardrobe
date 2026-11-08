'use client'

import { useState, useTransition } from 'react'

import { feedAction } from '@/app/actions/feed'
import type { FeedAction } from '@/lib/feed'

/**
 * A find acted on: the card leaves at once (`.leaving`) and the server's next
 * render drops it. If the server refuses, the card comes back and says so.
 */
export function useFindAction() {
  const [gone, setGone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [, startTransition] = useTransition()

  function send(input: FeedAction) {
    setGone(true)
    setFailed(false)
    startTransition(async () => {
      const result = await feedAction(input)
      if (!result.ok) {
        setGone(false)
        setFailed(true)
      }
    })
  }

  return { gone, failed, send }
}
