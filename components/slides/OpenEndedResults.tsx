'use client'

import { useMemo, useState } from 'react'
import type { Slide } from '@/lib/types'
import type { ResponseWithParticipant } from '@/components/PresenterView'
import WordCloudDisplay from '@/components/slides/WordCloudDisplay'
import { extractWordFrequencies, extractPhraseFrequencies } from '@/lib/wordUtils'

interface Props {
  slide: Slide
  responses: ResponseWithParticipant[]
}

type ViewMode = 'cloud' | 'list'
type MatchMode = 'words' | 'answers'

export default function OpenEndedResults({ slide: _slide, responses }: Props) {
  const total = responses.length
  const [view, setView] = useState<ViewMode>('cloud')
  const [matchMode, setMatchMode] = useState<MatchMode>('words')

  const answers = useMemo(() => responses.map((r) => r.answer), [responses])

  const wordFrequencies = useMemo(
    () =>
      matchMode === 'words'
        ? extractWordFrequencies(answers)
        : extractPhraseFrequencies(answers),
    [answers, matchMode]
  )

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Controls */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-beige-200 bg-beige-100 p-0.5">
          <button
            onClick={() => setView('cloud')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'cloud'
                ? 'bg-white text-charcoal-900 shadow-sm'
                : 'text-taupe-400 hover:text-espresso-800'
            }`}
          >
            Word Cloud
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'list'
                ? 'bg-white text-charcoal-900 shadow-sm'
                : 'text-taupe-400 hover:text-espresso-800'
            }`}
          >
            List
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === 'cloud' && (
            <div className="flex gap-1 rounded-lg border border-beige-200 bg-beige-100 p-0.5">
              <button
                onClick={() => setMatchMode('words')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  matchMode === 'words'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-taupe-400 hover:text-espresso-800'
                }`}
              >
                By Word
              </button>
              <button
                onClick={() => setMatchMode('answers')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  matchMode === 'answers'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-taupe-400 hover:text-espresso-800'
                }`}
              >
                By Answer
              </button>
            </div>
          )}
          <span className="shrink-0 text-sm text-muted-foreground">
            {total} {total === 1 ? 'response' : 'responses'}
          </span>
        </div>
      </div>

      {/* Content */}
      {view === 'cloud' ? (
        <div className="flex flex-1 items-start justify-center overflow-y-auto">
          <WordCloudDisplay words={wordFrequencies} />
        </div>
      ) : (
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
      )}
    </div>
  )
}
