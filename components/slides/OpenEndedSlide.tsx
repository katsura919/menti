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
      <div className="w-full max-w-lg space-y-4 text-center">
        <h2 className="text-xl font-semibold">{slide.question}</h2>
        <p className="text-muted-foreground">Response recorded ✓</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <h2 className="text-xl font-semibold text-center">{slide.question}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{answer.length}/500</span>
          <button
            type="submit"
            disabled={!answer.trim() || submitting}
            className="py-2 px-6 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}
