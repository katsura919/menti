"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import type { Presentation, Slide } from "@/lib/types"

type SlideForm = {
  id?: string
  type: "poll" | "open_ended"
  question: string
  options: string[]
}

type Props = {
  presentation?: Presentation & { slides: Slide[] }
}

function generateJoinCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

export default function PresentationEditor({ presentation }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!presentation

  const [title, setTitle] = useState(presentation?.title ?? "")
  const [slides, setSlides] = useState<SlideForm[]>(
    presentation?.slides?.map((s) => ({
      id: s.id,
      type: s.type,
      question: s.question,
      options: s.options ?? ["", ""],
    })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addSlide(type: "poll" | "open_ended") {
    setSlides((prev) => [
      ...prev,
      { type, question: "", options: type === "poll" ? ["", ""] : [] },
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
        i === slideIndex ? { ...s, options: [...s.options, ""] } : s
      )
    )
  }

  function updateOption(slideIndex: number, optIndex: number, value: string) {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIndex
          ? {
              ...s,
              options: s.options.map((o, oi) => (oi === optIndex ? value : o)),
            }
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
          .from("presentations")
          .update({ title })
          .eq("id", presentationId!)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("presentations")
          .insert({ title, join_code: generateJoinCode() })
          .select()
          .single()
        if (error) throw error
        presentationId = data.id
      }

      // delete + re-insert slides for simplicity
      if (isEdit) {
        const { error } = await supabase
          .from("slides")
          .delete()
          .eq("presentation_id", presentationId!)
        if (error) throw error
      }

      if (slides.length > 0) {
        const { error } = await supabase.from("slides").insert(
          slides.map((s, i) => ({
            presentation_id: presentationId,
            order_index: i,
            type: s.type,
            question: s.question,
            options: s.type === "poll" ? s.options.filter(Boolean) : null,
          }))
        )
        if (error) throw error
      }

      router.push("/")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <form
      id="presentation-form"
      onSubmit={handleSubmit}
      className="relative w-full space-y-6"
    >
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="text-sm font-medium text-charcoal-900"
        >
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="My presentation"
          className="bg-beige-50"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-light text-charcoal-900">
          Slides
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSlide("poll")}
          >
            + Poll
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSlide("open_ended")}
          >
            + Open-ended
          </Button>
        </div>
      </div>

      {slides.length === 0 && (
        <Alert>
          <div className="text-sm text-taupe-400">
            No slides yet. Add a slide to get started.
          </div>
        </Alert>
      )}

      <div className="grid gap-4">
        {slides.map((slide, i) => (
          <div key={i} className="card w-full p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-taupe-400">
                      {i + 1}. {slide.type === "poll" ? "Poll" : "Open-ended"}
                    </span>
                    <h3 className="mt-1 font-serif text-lg font-light text-charcoal-900">
                      {slide.question || "New question"}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlide(i)}
                  >
                    Remove
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium text-charcoal-900">
                    Question
                  </label>
                  <Input
                    value={slide.question}
                    onChange={(e) =>
                      updateSlide(i, { question: e.target.value })
                    }
                    required
                    placeholder="Ask something..."
                  />
                </div>

                {slide.type === "poll" && (
                  <div className="mt-3 space-y-2">
                    <label className="text-sm font-medium text-charcoal-900">
                      Options
                    </label>
                    <div className="space-y-2">
                      {slide.options.map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(i, oi, e.target.value)
                            }
                            placeholder={`Option ${oi + 1}`}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}
    </form>
  )
}
