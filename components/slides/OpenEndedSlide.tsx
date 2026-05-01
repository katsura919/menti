'use client'

import { useState } from 'react'
import type { Slide } from '@/lib/types'

interface Props {
  slide: Slide
  onSubmit: (answer: string) => Promise<void>
  disabled: boolean
}

export default function OpenEndedSlide({ slide, onSubmit, disabled }: Props) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!answer.trim() || submitting) return
    setSubmitting(true)
    await onSubmit(answer.trim())
    setSubmitting(false)
  }

  if (disabled) {
    return (
      <div className="w-full space-y-4 text-center">
        <h2 className="text-xl font-semibold leading-snug">{slide.question}</h2>
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-clay-600">
          <span>✓</span> Response recorded
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      <h2 className="text-xl font-semibold leading-snug text-center">{slide.question}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          rows={5}
          maxLength={500}
          className="w-full px-3 py-3 border rounded-lg bg-background text-foreground text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{answer.length}/500</span>
          <button
            type="submit"
            disabled={!answer.trim() || submitting}
            className="min-h-[48px] py-3 px-8 bg-primary text-primary-foreground rounded-lg font-medium text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}
