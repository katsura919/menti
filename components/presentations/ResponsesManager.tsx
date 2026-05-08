'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Slide } from '@/lib/types'

interface ResponseRow {
  id: string
  slide_id: string
  answer: string
  created_at: string
  participant: { display_name: string | null; email: string | null } | null
}

interface Props {
  slides: Slide[]
  initialResponses: ResponseRow[]
}

export default function ResponsesManager({ slides, initialResponses }: Props) {
  const supabase = createClient()
  const [responses, setResponses] = useState<ResponseRow[]>(initialResponses)
  const [openSlides, setOpenSlides] = useState<Set<string>>(
    new Set(slides.slice(0, 1).map((s) => s.id))
  )
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  function toggle(slideId: string) {
    setOpenSlides((prev) => {
      const next = new Set(prev)
      next.has(slideId) ? next.delete(slideId) : next.add(slideId)
      return next
    })
  }

  async function deleteResponse(responseId: string) {
    setDeleting((prev) => new Set(prev).add(responseId))
    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseId)

    if (!error) {
      setResponses((prev) => prev.filter((r) => r.id !== responseId))
    }
    setDeleting((prev) => {
      const next = new Set(prev)
      next.delete(responseId)
      return next
    })
  }

  async function deleteAllForSlide(slideId: string) {
    const ids = responses.filter((r) => r.slide_id === slideId).map((r) => r.id)
    if (!ids.length) return

    ids.forEach((id) =>
      setDeleting((prev) => new Set(prev).add(id))
    )

    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('slide_id', slideId)

    if (!error) {
      setResponses((prev) => prev.filter((r) => r.slide_id !== slideId))
    }
    setDeleting((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  return (
    <div className="space-y-3">
      {slides.map((slide, i) => {
        const slideResponses = responses.filter((r) => r.slide_id === slide.id)
        const isOpen = openSlides.has(slide.id)

        return (
          <div
            key={slide.id}
            className="overflow-hidden rounded-xl border border-beige-200 bg-white"
          >
            {/* Header */}
            <button
              onClick={() => toggle(slide.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-beige-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-beige-300 font-mono text-xs text-taupe-400">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-charcoal-900">
                    {slide.question}
                  </p>
                  <p className="text-xs text-taupe-400">
                    {slide.type === 'poll' ? 'Poll' : 'Open-ended'} ·{' '}
                    {slideResponses.length} response{slideResponses.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-taupe-400" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-taupe-400" />
              )}
            </button>

            {/* Body */}
            {isOpen && (
              <div className="border-t border-beige-200">
                {slideResponses.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-taupe-400">
                    No responses yet
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-end px-5 py-2">
                      <button
                        onClick={() => deleteAllForSlide(slide.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete all ({slideResponses.length})
                      </button>
                    </div>
                    <div className="divide-y divide-beige-100">
                      {slideResponses.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-start justify-between gap-4 px-5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-taupe-400">
                              {r.participant?.display_name ?? 'Anonymous'}
                              {r.participant?.email && (
                                <span className="ml-2 font-normal">
                                  {r.participant.email}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-sm text-charcoal-900">
                              {r.answer}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteResponse(r.id)}
                            disabled={deleting.has(r.id)}
                            className="shrink-0 rounded-lg p-1.5 text-taupe-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                            title="Delete response"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
