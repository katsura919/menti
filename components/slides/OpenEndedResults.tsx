'use client'

import type { Slide, Response } from '@/lib/types'

interface Props {
  slide: Slide
  responses: Response[]
}

export default function OpenEndedResults({ slide, responses }: Props) {
  const total = responses.length

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium truncate">{slide.question}</h3>
        <span className="text-sm text-muted-foreground shrink-0 ml-2">
          {total} {total === 1 ? 'response' : 'responses'}
        </span>
      </div>
      <div className="h-[220px] overflow-y-auto space-y-2 pr-1">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center pt-8">
            Waiting for responses...
          </p>
        ) : (
          [...responses].reverse().map((r) => (
            <div
              key={r.id}
              className="rounded-lg border bg-muted/40 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-2 duration-300"
            >
              {r.answer}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
