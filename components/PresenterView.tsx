'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import PollResults from '@/components/slides/PollResults'
import OpenEndedResults from '@/components/slides/OpenEndedResults'
import type { Presentation, Slide, Response } from '@/lib/types'

interface Props {
  presentation: Presentation
  slides: Slide[]
}

export default function PresenterView({ presentation, slides }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [currentSlideIndex, setCurrentSlideIndex] = useState(presentation.current_slide_index)
  const [isActive, setIsActive] = useState(presentation.is_active)
  const [responses, setResponses] = useState<Response[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [working, setWorking] = useState(false)

  const currentSlideIndexRef = useRef(currentSlideIndex)
  currentSlideIndexRef.current = currentSlideIndex

  const currentSlide: Slide | null = slides[currentSlideIndex] ?? null

  // Fetch responses for a given slide
  async function fetchResponses(slideId: string) {
    const { data } = await supabase
      .from('responses')
      .select('*')
      .eq('slide_id', slideId)
      .order('created_at', { ascending: true })
    setResponses(data ?? [])
  }

  // Initial load: participant count + responses
  useEffect(() => {
    async function init() {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('presentation_id', presentation.id)
      setParticipantCount(count ?? 0)

      if (currentSlide) await fetchResponses(currentSlide.id)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch responses when slide changes
  useEffect(() => {
    if (currentSlide) fetchResponses(currentSlide.id)
    else setResponses([])
  }, [currentSlideIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: new responses
  useEffect(() => {
    const channel = supabase
      .channel(`presenter-responses-${presentation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        (payload) => {
          const r = payload.new as Response
          const activeSlide = slides[currentSlideIndexRef.current]
          if (activeSlide && r.slide_id === activeSlide.id) {
            setResponses((prev) => [...prev, r])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, presentation.id, slides])

  // Realtime: participant count
  useEffect(() => {
    const channel = supabase
      .channel(`presenter-participants-${presentation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `presentation_id=eq.${presentation.id}`,
        },
        () => {
          setParticipantCount((n) => n + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, presentation.id])

  async function startSession() {
    setWorking(true)
    await supabase
      .from('presentations')
      .update({ is_active: true, current_slide_index: 0 })
      .eq('id', presentation.id)
    setIsActive(true)
    setCurrentSlideIndex(0)
    setWorking(false)
  }

  async function endSession() {
    setWorking(true)
    await supabase
      .from('presentations')
      .update({ is_active: false })
      .eq('id', presentation.id)
    setIsActive(false)
    setWorking(false)
  }

  async function goTo(index: number) {
    setWorking(true)
    await supabase
      .from('presentations')
      .update({ current_slide_index: index })
      .eq('id', presentation.id)
    setCurrentSlideIndex(index)
    setWorking(false)
  }

  const isFirst = currentSlideIndex === 0
  const isLast = currentSlideIndex === slides.length - 1

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {presentation.join_code}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isActive ? 'Live' : 'Not started'}
          </span>
          <span className="text-sm text-muted-foreground">
            👥 {participantCount}
          </span>
        </div>

        <div className="flex gap-2">
          {!isActive ? (
            <Button onClick={startSession} disabled={working || slides.length === 0}>
              Start session
            </Button>
          ) : (
            <Button variant="destructive" onClick={endSession} disabled={working}>
              End session
            </Button>
          )}
        </div>
      </div>

      {slides.length === 0 ? (
        <p className="text-muted-foreground text-sm">No slides. Add slides before presenting.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Slide navigator */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
              <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded">
                {currentSlide?.type === 'poll' ? 'Poll' : 'Open ended'}
              </span>
            </div>

            {currentSlide && (
              <p className="text-lg font-medium leading-snug">{currentSlide.question}</p>
            )}

            {currentSlide?.type === 'poll' && currentSlide.options && (
              <ul className="space-y-1">
                {currentSlide.options.map((opt) => (
                  <li key={opt} className="text-sm text-muted-foreground pl-3 border-l-2">
                    {opt}
                  </li>
                ))}
              </ul>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => goTo(currentSlideIndex - 1)}
                disabled={isFirst || working || !isActive}
                className="flex-1"
              >
                ← Prev
              </Button>
              <Button
                onClick={() => goTo(currentSlideIndex + 1)}
                disabled={isLast || working || !isActive}
                className="flex-1"
              >
                Next →
              </Button>
            </div>

            {/* Slide thumbnail list */}
            <div className="flex gap-1 flex-wrap pt-1">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => isActive && goTo(i)}
                  disabled={!isActive || working}
                  className={`w-7 h-7 text-xs rounded font-mono transition-colors ${
                    i === currentSlideIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  } disabled:pointer-events-none`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Live results */}
          <div className="rounded-lg border p-6">
            {currentSlide?.type === 'poll' ? (
              <PollResults slide={currentSlide} responses={responses} />
            ) : currentSlide?.type === 'open_ended' ? (
              <OpenEndedResults slide={currentSlide} responses={responses} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
