"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import PollResults from "@/components/slides/PollResults"
import OpenEndedResults from "@/components/slides/OpenEndedResults"
import type { Presentation, Slide, Response } from "@/lib/types"

interface Props {
  presentation: Presentation
  slides: Slide[]
}

export default function PresenterView({ presentation, slides }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    presentation.current_slide_index
  )
  const [isActive, setIsActive] = useState(presentation.is_active)
  const [responses, setResponses] = useState<Response[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [working, setWorking] = useState(false)

  const currentSlideIndexRef = useRef(currentSlideIndex)
  currentSlideIndexRef.current = currentSlideIndex

  const currentSlide: Slide | null = slides[currentSlideIndex] ?? null

  async function fetchResponses(slideId: string) {
    const { data } = await supabase
      .from("responses")
      .select("*")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: true })
    setResponses(data ?? [])
  }

  useEffect(() => {
    async function init() {
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("presentation_id", presentation.id)
      setParticipantCount(count ?? 0)
      if (currentSlide) await fetchResponses(currentSlide.id)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentSlide) fetchResponses(currentSlide.id)
    else setResponses([])
  }, [currentSlideIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback for live responses
  useEffect(() => {
    if (!isActive || !currentSlide) return
    const interval = setInterval(() => fetchResponses(currentSlide.id), 3000)
    return () => clearInterval(interval)
  }, [isActive, currentSlideIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: new responses
  useEffect(() => {
    const channel = supabase
      .channel(`presenter-responses-${presentation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        (payload) => {
          const r = payload.new as Response
          const activeSlide = slides[currentSlideIndexRef.current]
          if (activeSlide && r.slide_id === activeSlide.id) {
            setResponses((prev) => [...prev, r])
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, presentation.id, slides])

  // Realtime: participant count
  useEffect(() => {
    const channel = supabase
      .channel(`presenter-participants-${presentation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `presentation_id=eq.${presentation.id}`,
        },
        () => {
          setParticipantCount((n) => n + 1)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, presentation.id])

  async function startSession() {
    setWorking(true)
    await supabase
      .from("presentations")
      .update({ is_active: true, current_slide_index: 0 })
      .eq("id", presentation.id)
    setIsActive(true)
    setCurrentSlideIndex(0)
    setWorking(false)
  }

  async function endSession() {
    setWorking(true)
    await supabase
      .from("presentations")
      .update({ is_active: false })
      .eq("id", presentation.id)
    setIsActive(false)
    setWorking(false)
  }

  async function goTo(index: number) {
    setWorking(true)
    await supabase
      .from("presentations")
      .update({ current_slide_index: index })
      .eq("id", presentation.id)
    setCurrentSlideIndex(index)
    setWorking(false)
  }

  const isFirst = currentSlideIndex === 0
  const isLast = currentSlideIndex === slides.length - 1

  // Lobby: session not started
  if (!isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-beige-50 p-8 text-charcoal-900">
        <p className="text-sm font-medium text-taupe-400">
          {presentation.title}
        </p>
        <div className="space-y-3 text-center">
          <p className="text-xs tracking-widest text-taupe-400 uppercase">
            Join code
          </p>
          <p className="font-mono text-8xl font-bold tracking-widest text-clay-600">
            {presentation.join_code}
          </p>
        </div>
        <p className="text-sm text-taupe-400">
          👥 {participantCount} participant{participantCount !== 1 ? "s" : ""}{" "}
          waiting
        </p>
        <button
          onClick={startSession}
          disabled={working || slides.length === 0}
          className="mt-2 rounded-full bg-clay-500 px-10 py-3 text-base font-semibold text-beige-50 transition-colors hover:bg-clay-600 disabled:opacity-40"
        >
          {working ? "Starting..." : "Start Session"}
        </button>
        {slides.length === 0 && (
          <p className="text-sm text-red-400">Add slides before starting</p>
        )}
      </div>
    )
  }

  if (!currentSlide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-beige-50 text-charcoal-900">
        <p className="text-taupe-400">No slides in this presentation</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-beige-50 text-charcoal-900">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-beige-200 bg-white/90 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="rounded bg-beige-100 px-3 py-1 font-mono text-sm text-clay-600">
            {presentation.join_code}
          </span>
          <span className="text-sm text-taupe-400">👥 {participantCount}</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            ● Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-taupe-400">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={endSession}
            disabled={working}
            className="rounded-lg bg-red-100 px-4 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-200 disabled:opacity-40"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Slide panel */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10 p-10 lg:p-16">
          <div className="w-full max-w-2xl space-y-8">
            <span className="text-xs tracking-widest text-taupe-400 uppercase">
              {currentSlide.type === "poll" ? "Poll" : "Open-ended"}
            </span>
            <h1 className="font-serif text-4xl leading-tight font-light text-charcoal-900 lg:text-5xl">
              {currentSlide.question}
            </h1>
            {currentSlide.type === "poll" && currentSlide.options && (
              <ul className="space-y-3 pt-2">
                {currentSlide.options.map((opt, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 text-xl text-espresso-800"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-beige-300 font-mono text-sm text-taupe-400">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="flex w-full shrink-0 flex-col overflow-hidden border-t border-beige-200 bg-beige-100/50 lg:w-[380px] lg:border-t-0 lg:border-l">
          <div className="border-b border-beige-200 px-6 py-4">
            <p className="text-xs tracking-widest text-taupe-400 uppercase">
              Live Results
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {currentSlide.type === "poll" ? (
              <PollResults slide={currentSlide} responses={responses} />
            ) : (
              <OpenEndedResults slide={currentSlide} responses={responses} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex shrink-0 items-center justify-between border-t border-beige-200 bg-white/90 px-6 py-4">
        <button
          onClick={() => goTo(currentSlideIndex - 1)}
          disabled={isFirst || working}
          className="rounded-lg border border-beige-300 px-6 py-2.5 text-sm font-medium text-clay-600 transition-colors hover:bg-beige-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Prev
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              disabled={working}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentSlideIndex
                  ? "bg-clay-500"
                  : "hover:bg-clay-300 bg-beige-300"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(currentSlideIndex + 1)}
          disabled={isLast || working}
          className="rounded-lg border border-beige-300 px-6 py-2.5 text-sm font-medium text-clay-600 transition-colors hover:bg-beige-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
