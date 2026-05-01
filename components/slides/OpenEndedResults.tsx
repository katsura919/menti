'use client'

import type { Slide } from '@/lib/types'
import type { ResponseWithParticipant } from '@/components/PresenterView'

interface Props {
  slide: Slide
  responses: ResponseWithParticipant[]
}

export default function OpenEndedResults({ slide, responses }: Props) {
  const total = responses.length

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center justify-end">
        <span className="shrink-0 text-sm text-muted-foreground">
          {total} {total === 1 ? 'response' : 'responses'}
        </span>
      </div>
      <div className="space-y-2 pr-1">
        {responses.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Waiting for responses...
          </p>
        ) : (
          [...responses].reverse().map((r) => (
            <div
              key={r.id}
              className="animate-in fade-in slide-in-from-top-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm duration-300"
            >
              <p className="mb-0.5 text-xs font-medium text-taupe-400">
                {r.participant?.display_name ?? 'Anonymous'}
              </p>
              <p>{r.answer}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
