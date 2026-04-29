"use client"

import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
  Suspense,
} from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Presentation, Slide, Participant } from "@/lib/types"
import PollSlide from "@/components/slides/PollSlide"
import OpenEndedSlide from "@/components/slides/OpenEndedSlide"

const SESSION_KEY = "menti_session"

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

type Status = "loading" | "waiting" | "active" | "ended" | "error"

function AudienceView() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = (params.code as string).toUpperCase()
  const displayName = searchParams.get("name") || null

  const supabase = useMemo(() => createClient(), [])

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [answeredSlides, setAnsweredSlides] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<Status>("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const statusRef = useRef<Status>("loading")
  statusRef.current = status

  const registerParticipant = useCallback(
    async (presentationId: string, sessionId: string): Promise<Participant> => {
      // Re-join: return existing participant for this session
      const { data: existing } = await supabase
        .from("participants")
        .select("*")
        .eq("presentation_id", presentationId)
        .eq("session_id", sessionId)
        .maybeSingle()

      if (existing) return existing

      const { data, error } = await supabase
        .from("participants")
        .insert({
          presentation_id: presentationId,
          session_id: sessionId,
          display_name: displayName,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    [supabase, displayName]
  )

  useEffect(() => {
    async function init() {
      try {
        const sessionId = getOrCreateSessionId()

        const { data: pres, error: presError } = await supabase
          .from("presentations")
          .select("*, slides(*)")
          .eq("join_code", code)
          .single()

        if (presError || !pres) {
          setErrorMsg("Presentation not found")
          setStatus("error")
          return
        }

        const sorted: Slide[] = (pres.slides ?? []).sort(
          (a: Slide, b: Slide) => a.order_index - b.order_index
        )

        setPresentation(pres)
        setSlides(sorted)
        setCurrentSlideIndex(pres.current_slide_index)
        setStatus(pres.is_active ? "active" : "waiting")

        const p = await registerParticipant(pres.id, sessionId)
        setParticipant(p)

        if (sorted.length > 0) {
          const { data: answered } = await supabase
            .from("responses")
            .select("slide_id")
            .eq("participant_id", p.id)
            .in(
              "slide_id",
              sorted.map((s) => s.id)
            )

          if (answered) {
            setAnsweredSlides(
              new Set(answered.map((r: { slide_id: string }) => r.slide_id))
            )
          }
        }
      } catch (err) {
        console.error(err)
        setErrorMsg("Failed to join session")
        setStatus("error")
      }
    }

    init()
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!presentation) return

    const channel = supabase
      .channel(`slide-advance-${presentation.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "presentations",
        },
        async (payload) => {
          const updated = payload.new as Presentation
          if (updated.id !== presentation.id) return
          setCurrentSlideIndex(updated.current_slide_index)

          if (updated.is_active && statusRef.current === "waiting") {
            const { data: slidesData } = await supabase
              .from("slides")
              .select("*")
              .eq("presentation_id", presentation.id)
              .order("order_index")
            if (slidesData?.length) setSlides(slidesData)
            setStatus("active")
          }
          if (!updated.is_active && statusRef.current === "active") {
            setStatus("ended")
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, presentation?.id])

  // Polling fallback: Realtime can silently miss UPDATE events
  useEffect(() => {
    if ((status !== "waiting" && status !== "active") || !presentation) return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("presentations")
        .select("is_active, current_slide_index")
        .eq("id", presentation.id)
        .single()

      if (!data) return

      if (data.is_active && statusRef.current === "waiting") {
        const { data: slidesData } = await supabase
          .from("slides")
          .select("*")
          .eq("presentation_id", presentation.id)
          .order("order_index")
        if (slidesData?.length) setSlides(slidesData)
        setCurrentSlideIndex(data.current_slide_index)
        setStatus("active")
      } else if (statusRef.current === "active") {
        setCurrentSlideIndex(data.current_slide_index)
        if (!data.is_active) setStatus("ended")
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [status, presentation, supabase])

  async function handleSubmit(answer: string) {
    if (!participant || !currentSlide) return

    const { error } = await supabase.from("responses").insert({
      slide_id: currentSlide.id,
      participant_id: participant.id,
      answer,
    })

    if (error && error.code !== "23505") {
      console.error(error)
      return
    }

    setAnsweredSlides((prev) => new Set(prev).add(currentSlide.id))
  }

  const currentSlide = slides[currentSlideIndex] ?? null
  const alreadyAnswered = currentSlide
    ? answeredSlides.has(currentSlide.id)
    : false

  if (status === "loading") {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-clay-500 border-t-transparent" />
          <p className="text-sm text-taupe-400">Joining session...</p>
        </div>
      </Screen>
    )
  }

  if (status === "error") {
    return (
      <Screen>
        <div className="space-y-4 text-center">
          <p className="font-serif text-2xl font-light text-charcoal-900">
            Could not join
          </p>
          <p className="text-sm text-taupe-400">
            {errorMsg || "Something went wrong"}
          </p>
          <Link
            href="/join"
            className="inline-block rounded-full border border-beige-300 px-4 py-2 text-sm text-clay-600 hover:bg-beige-100"
          >
            Try another code
          </Link>
        </div>
      </Screen>
    )
  }

  if (status === "waiting") {
    return (
      <Screen>
        <div className="card flex max-w-sm flex-col items-center gap-4 border-beige-200 bg-white p-8 text-center">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-clay-500/10">
              <div className="h-4 w-4 animate-pulse rounded-full bg-clay-500" />
            </div>
            <div className="absolute inset-0 animate-ping rounded-full bg-clay-500/10 opacity-50" />
          </div>
          {presentation && (
            <p className="font-serif text-2xl leading-tight font-light text-charcoal-900">
              {presentation.title}
            </p>
          )}
          <p className="text-sm text-taupe-400">Host will start session soon</p>
          <span className="rounded-full border border-beige-300 bg-beige-50 px-3 py-1 font-mono text-xs text-taupe-400">
            {code}
          </span>
        </div>
      </Screen>
    )
  }

  if (status === "ended") {
    return (
      <Screen>
        <div className="card flex max-w-sm flex-col items-center gap-4 border-beige-200 bg-white p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
            ✓
          </div>
          {presentation && (
            <p className="font-serif text-2xl leading-tight font-light text-charcoal-900">
              {presentation.title}
            </p>
          )}
          <p className="font-medium text-charcoal-900">Session ended</p>
          <p className="text-sm text-taupe-400">Thanks for participating!</p>
          <Link
            href="/join"
            className="mt-2 rounded-full border border-beige-300 px-4 py-2 text-sm text-clay-600 hover:bg-beige-100"
          >
            Join another session
          </Link>
        </div>
      </Screen>
    )
  }

  if (!currentSlide) return <Screen>No slides in this presentation</Screen>

  return (
    <div className="flex min-h-[100dvh] flex-col bg-beige-50">
      <header className="shrink-0 border-b border-beige-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <span className="rounded-full border border-beige-300 bg-beige-50 px-3 py-1 font-mono text-xs text-taupe-400">
            {code}
          </span>
          <span className="text-sm text-taupe-400">
            {currentSlideIndex + 1} / {slides.length}
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-lg">
          {currentSlide.type === "poll" ? (
            <PollSlide
              slide={currentSlide}
              onSubmit={handleSubmit}
              disabled={alreadyAnswered}
            />
          ) : (
            <OpenEndedSlide
              slide={currentSlide}
              onSubmit={handleSubmit}
              disabled={alreadyAnswered}
            />
          )}
        </div>
      </main>
      {/* iOS home indicator spacing */}
      <div className="h-safe-area-inset-bottom shrink-0 pb-4" />
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-beige-50 p-6">
      {children}
    </div>
  )
}

export default function AudiencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-beige-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-clay-500 border-t-transparent" />
        </div>
      }
    >
      <AudienceView />
    </Suspense>
  )
}
