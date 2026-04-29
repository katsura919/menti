'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Presentation, Slide } from '@/lib/types'

type SlideForm = {
  id?: string
  type: 'poll' | 'open_ended'
  question: string
  options: string[]
}

type Props = {
  presentation?: Presentation & { slides: Slide[] }
}

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export default function PresentationEditor({ presentation }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!presentation

  const [title, setTitle] = useState(presentation?.title ?? '')
  const [slides, setSlides] = useState<SlideForm[]>(
    presentation?.slides?.map((s) => ({
      id: s.id,
      type: s.type,
      question: s.question,
      options: s.options ?? ['', ''],
    })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addSlide(type: 'poll' | 'open_ended') {
    setSlides((prev) => [
      ...prev,
      { type, question: '', options: type === 'poll' ? ['', ''] : [] },
    ])
  }

  function removeSlide(index: number) {
    setSlides((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSlide(index: number, updates: Partial<SlideForm>) {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    )
  }

  function addOption(slideIndex: number) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex ? { ...s, options: [...s.options, ''] } : s
      )
    )
  }

  function updateOption(slideIndex: number, optIndex: number, value: string) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? { ...s, options: s.options.map((o, oi) => (oi === optIndex ? value : o)) }
          : s
      )
    )
  }

  function removeOption(slideIndex: number, optIndex: number) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? { ...s, options: s.options.filter((_, oi) => oi !== optIndex) }
          : s
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let presentationId = presentation?.id

      if (isEdit) {
        const { error } = await supabase
          .from('presentations')
          .update({ title })
          .eq('id', presentationId!)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('presentations')
          .insert({ title, join_code: generateJoinCode() })
          .select()
          .single()
        if (error) throw error
        presentationId = data.id
      }

      // delete + re-insert slides for simplicity
      if (isEdit) {
        const { error } = await supabase
          .from('slides')
          .delete()
          .eq('presentation_id', presentationId!)
        if (error) throw error
      }

      if (slides.length > 0) {
        const { error } = await supabase.from('slides').insert(
          slides.map((s, i) => ({
            presentation_id: presentationId,
            order_index: i,
            type: s.type,
            question: s.question,
            options: s.type === 'poll' ? s.options.filter(Boolean) : null,
          }))
        )
        if (error) throw error
      }

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="My presentation"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Slides</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSlide('poll')}
            >
              + Poll
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSlide('open_ended')}
            >
              + Open-ended
            </Button>
          </div>
        </div>

        {slides.length === 0 && (
          <p className="text-sm text-muted-foreground">No slides yet.</p>
        )}

        {slides.map((slide, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {i + 1}. {slide.type === 'poll' ? 'Poll' : 'Open-ended'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSlide(i)}
              >
                Remove
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Question</label>
              <input
                value={slide.question}
                onChange={(e) => updateSlide(i, { question: e.target.value })}
                required
                placeholder="Ask something..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {slide.type === 'poll' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                {slide.options.map((opt, oi) => (
                  <div key={oi} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    {slide.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(i, oi)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addOption(i)}
                >
                  + Add option
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create presentation'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
