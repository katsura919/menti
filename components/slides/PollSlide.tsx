'use client'

import { useState } from 'react'
import type { Slide } from '@/lib/types'

interface Props {
  slide: Slide
  onSubmit: (answer: string) => Promise<void>
  disabled: boolean
}

export default function PollSlide({ slide, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!selected || submitting) return
    setSubmitting(true)
    await onSubmit(selected)
    setSubmitting(false)
  }

  if (disabled) {
    return (
      <div className="w-full space-y-4 text-center">
        <h2 className="text-xl font-semibold leading-snug">{slide.question}</h2>
        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400">
          <span>✓</span> Response recorded
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      <h2 className="text-xl font-semibold leading-snug text-center">{slide.question}</h2>
      <div className="space-y-2">
        {(slide.options ?? []).map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`w-full min-h-[52px] px-4 py-3 rounded-lg border text-left text-base transition-colors active:scale-[0.98] ${
              selected === option
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-accent border-border'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="w-full min-h-[52px] py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  )
}
