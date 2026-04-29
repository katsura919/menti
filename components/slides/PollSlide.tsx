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
      <div className="w-full max-w-lg space-y-4 text-center">
        <h2 className="text-xl font-semibold">{slide.question}</h2>
        <p className="text-muted-foreground">Response recorded ✓</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <h2 className="text-xl font-semibold text-center">{slide.question}</h2>
      <div className="space-y-2">
        {(slide.options ?? []).map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`w-full px-4 py-3 rounded-lg border text-left transition-colors ${
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
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  )
}
