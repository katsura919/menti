"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Radio,
  Square,
  Users,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/client"
import PollResults from "@/components/slides/PollResults"
import OpenEndedResults from "@/components/slides/OpenEndedResults"
import type { Presentation, Slide, Response } from "@/lib/types"

export type ResponseWithParticipant = Response & {
  participant: { display_name: string | null } | null
}

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
  const [responses, setResponses] = useState<ResponseWithParticipant[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [working, setWorking] = useState(false)
  const [joinUrl, setJoinUrl] = useState("")

  const currentSlideIndexRef = useRef(currentSlideIndex)
  currentSlideIndexRef.current = currentSlideIndex

  const currentSlide: Slide | null = slides[currentSlideIndex] ?? null

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join/${presentation.join_code}`)
  }, [presentation.join_code])

  async function fetchResponses(slideId: string) {
    const { data } = await supabase
      .from("responses")
      .select("*, participant:participants(display_name)")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: true })
    setResponses((data as ResponseWithParticipant[]) ?? [])
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
          const r = {
            ...(payload.new as Response),
            participant: null,
          } as ResponseWithParticipant
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
  const joinBase = joinUrl
    ? `${new URL(joinUrl).origin.replace(/^https?:\/\//, "")}/join`
    : "menti.talentmucho.com/join"

  // ── Lobby ────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="flex min-h-screen flex-col bg-beige-50">
        {/* Top strip */}
        <div className="flex items-center justify-between border-b border-beige-200 bg-white px-8 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/tm-logo.png"
              alt="TalentMucho"
              className="h-8 w-auto object-contain"
            />
            <span className="font-serif text-lg font-light text-charcoal-900">
              {presentation.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-taupe-400">
            <Users className="h-4 w-4" />
            {participantCount} joined
          </div>
        </div>

        {/* Main lobby card */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-beige-200 bg-white shadow-lg">
            <div className="flex flex-col md:flex-row">
              {/* QR side */}
              <div className="flex flex-col items-center justify-center gap-5 bg-beige-50 p-10 md:w-[280px] md:shrink-0">
                <p className="text-xs font-medium tracking-widest text-taupe-400 uppercase">
                  Scan to join
                </p>
                {joinUrl ? (
                  <div className="rounded-xl border-4 border-white p-2 shadow-md">
                    <QRCodeSVG
                      value={joinUrl}
                      size={180}
                      bgColor="#faf8f5"
                      fgColor="#2a2520"
                      level="M"
                    />
                  </div>
                ) : (
                  <div className="h-[196px] w-[196px] animate-pulse rounded-xl bg-beige-200" />
                )}
                <p className="text-center text-xs text-taupe-400">{joinBase}</p>
              </div>

              {/* Divider */}
              {/* <div className="flex items-center justify-center md:py-10">
                <div className="h-px w-full bg-beige-200 md:h-full md:w-px" />
                <span className="absolute bg-white px-2 py-1 text-xs font-medium text-taupe-400 md:static md:px-0 md:py-2">
                  or
                </span>
              </div> */}

              {/* Code side */}
              <div className="flex flex-1 flex-col justify-center gap-6 p-10">
                <div>
                  <p className="mb-3 text-xs font-medium tracking-widest text-taupe-400 uppercase">
                    Enter code at
                  </p>
                  <p className="font-medium text-clay-600">{joinBase}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium tracking-widest text-taupe-400 uppercase">
                    Code
                  </p>
                  <p className="font-mono text-6xl font-bold tracking-[0.15em] text-charcoal-900">
                    {presentation.join_code}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-taupe-400">
                  <Users className="h-4 w-4" />
                  <span>
                    <strong className="font-semibold text-charcoal-900">
                      {participantCount}
                    </strong>{" "}
                    participant{participantCount !== 1 ? "s" : ""} waiting
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={startSession}
                    disabled={working || slides.length === 0}
                    className="w-full rounded-xl bg-clay-500 py-3.5 text-base font-semibold text-beige-50 transition-colors hover:bg-clay-600 disabled:opacity-40"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {working ? "Starting..." : "Start Session"}
                    </span>
                  </button>
                  {slides.length === 0 && (
                    <p className="mt-2 text-center text-xs text-red-500">
                      Add slides before starting
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentSlide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-beige-50">
        <p className="text-taupe-400">No slides in this presentation</p>
      </div>
    )
  }

  // ── Active presentation ──────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-beige-50 text-charcoal-900">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-beige-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Mini QR popover */}
          <div className="group relative">
            <button className="flex items-center gap-2 rounded-lg border border-beige-200 bg-beige-50 px-3 py-1.5 font-mono text-sm font-semibold text-clay-600 transition-colors hover:bg-beige-100">
              {presentation.join_code}
            </button>
            {joinUrl && (
              <div className="absolute top-full left-0 z-50 mt-2 hidden rounded-xl border border-beige-200 bg-white p-3 shadow-lg group-hover:block">
                <QRCodeSVG
                  value={joinUrl}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#2a2520"
                  level="M"
                />
                <p className="mt-2 text-center text-[10px] text-taupe-400">
                  {joinBase}
                </p>
              </div>
            )}
          </div>
          <span className="text-sm text-taupe-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {participantCount}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <Radio className="h-3.5 w-3.5" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-taupe-400">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={endSession}
            disabled={working}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              <Square className="h-3.5 w-3.5" />
              End Session
            </span>
          </button>
        </div>
      </div>

      {/* Slide + Results */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-10 lg:p-16">
          <div className="w-full max-w-2xl space-y-8">
            <span className="text-xs font-medium tracking-widest text-taupe-400 uppercase">
              {currentSlide.type === "poll" ? "Poll" : "Open-ended"} · Slide{" "}
              {currentSlideIndex + 1}
            </span>
            <h1 className="font-serif text-4xl leading-tight font-light text-charcoal-900 lg:text-5xl">
              {currentSlide.question}
            </h1>
            {currentSlide.type === "poll" && currentSlide.options && (
              <ul className="space-y-3 pt-2">
                {currentSlide.options.map((opt, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 text-lg text-espresso-800"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-beige-300 font-mono text-sm text-taupe-400">
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
        <div className="flex w-[420px] shrink-0 flex-col border-l border-beige-200 bg-beige-100/60">
          <div className="border-b border-beige-200 px-6 py-4">
            <p className="text-xs font-medium tracking-widest text-taupe-400 uppercase">
              Live Results
            </p>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            {currentSlide.type === "poll" ? (
              <PollResults slide={currentSlide} responses={responses} />
            ) : (
              <OpenEndedResults slide={currentSlide} responses={responses} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex shrink-0 items-center justify-between border-t border-beige-200 bg-white px-6 py-4">
        <button
          onClick={() => goTo(currentSlideIndex - 1)}
          disabled={isFirst || working}
          className="rounded-xl border border-beige-200 px-6 py-2.5 text-sm font-medium text-espresso-800 transition-colors hover:bg-beige-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <span className="inline-flex items-center gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Prev
          </span>
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
                  : "bg-beige-300 hover:bg-taupe-400"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(currentSlideIndex + 1)}
          disabled={isLast || working}
          className="rounded-xl bg-clay-500 px-6 py-2.5 text-sm font-medium text-beige-50 transition-colors hover:bg-clay-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <span className="inline-flex items-center gap-1.5">
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  )
}
