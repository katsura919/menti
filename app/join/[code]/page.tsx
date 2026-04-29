'use client'

import { useEffect, useRef, useMemo, useState, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Presentation, Slide, Participant } from '@/lib/types'
import PollSlide from '@/components/slides/PollSlide'
import OpenEndedSlide from '@/components/slides/OpenEndedSlide'

const SESSION_KEY = 'menti_session'

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

type Status = 'loading' | 'waiting' | 'active' | 'ended' | 'error'

function AudienceView() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = (params.code as string).toUpperCase()
  const displayName = searchParams.get('name') || null

  const supabase = useMemo(() => createClient(), [])

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [answeredSlides, setAnsweredSlides] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const statusRef = useRef<Status>('loading')
  statusRef.current = status

  const registerParticipant = useCallback(
    async (presentationId: string, sessionId: string): Promise<Participant> => {
      // Re-join: return existing participant for this session
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('presentation_id', presentationId)
        .eq('session_id', sessionId)
        .maybeSingle()

      if (existing) return existing

      const { data, error } = await supabase
        .from('participants')
        .insert({ presentation_id: presentationId, session_id: sessionId, display_name: displayName })
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
          .from('presentations')
          .select('*, slides(*)')
          .eq('join_code', code)
          .single()

        if (presError || !pres) {
          setErrorMsg('Presentation not found')
          setStatus('error')
          return
        }

        const sorted: Slide[] = (pres.slides ?? []).sort(
          (a: Slide, b: Slide) => a.order_index - b.order_index
        )

        setPresentation(pres)
        setSlides(sorted)
        setCurrentSlideIndex(pres.current_slide_index)
        setStatus(pres.is_active ? 'active' : 'waiting')

        const p = await registerParticipant(pres.id, sessionId)
        setParticipant(p)

        if (sorted.length > 0) {
          const { data: answered } = await supabase
            .from('responses')
            .select('slide_id')
            .eq('participant_id', p.id)
            .in('slide_id', sorted.map((s) => s.id))

          if (answered) {
            setAnsweredSlides(new Set(answered.map((r: { slide_id: string }) => r.slide_id)))
          }
        }
      } catch (err) {
        console.error(err)
        setErrorMsg('Failed to join session')
        setStatus('error')
      }
    }

    init()
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!presentation) return

    const channel = supabase
      .channel(`slide-advance-${presentation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'presentations',
          filter: `id=eq.${presentation.id}`,
        },
        (payload) => {
          const updated = payload.new as Presentation
          setCurrentSlideIndex(updated.current_slide_index)

          if (updated.is_active && statusRef.current === 'waiting') {
            setStatus('active')
          }
          if (!updated.is_active && statusRef.current === 'active') {
            setStatus('ended')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, presentation?.id])

  async function handleSubmit(answer: string) {
    if (!participant || !currentSlide) return

    const { error } = await supabase.from('responses').insert({
      slide_id: currentSlide.id,
      participant_id: participant.id,
      answer,
    })

    if (error && error.code !== '23505') {
      console.error(error)
      return
    }

    setAnsweredSlides((prev) => new Set(prev).add(currentSlide.id))
  }

  const currentSlide = slides[currentSlideIndex] ?? null
  const alreadyAnswered = currentSlide ? answeredSlides.has(currentSlide.id) : false

  if (status === 'loading') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Joining...</p>
        </div>
      </Screen>
    )
  }

  if (status === 'error') {
    return (
      <Screen>
        <div className="space-y-3 text-center">
          <p className="text-lg font-medium">{errorMsg || 'Something went wrong'}</p>
          <Link
            href="/join"
            className="inline-block text-sm text-primary underline underline-offset-4"
          >
            Try another code
          </Link>
        </div>
      </Screen>
    )
  }

  if (status === 'waiting') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-50" />
          </div>
          {presentation && (
            <p className="font-semibold text-lg leading-tight">{presentation.title}</p>
          )}
          <p className="text-muted-foreground text-sm">Waiting for session to start</p>
          <span className="font-mono text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
            {code}
          </span>
        </div>
      </Screen>
    )
  }

  if (status === 'ended') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl">
            ✓
          </div>
          {presentation && (
            <p className="font-semibold text-lg leading-tight">{presentation.title}</p>
          )}
          <p className="font-medium">Session ended</p>
          <p className="text-muted-foreground text-sm">Thanks for participating!</p>
          <Link
            href="/join"
            className="mt-2 text-sm text-primary underline underline-offset-4"
          >
            Join another session
          </Link>
        </div>
      </Screen>
    )
  }

  if (!currentSlide) return <Screen>No slides in this presentation</Screen>

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <span className="font-mono text-sm text-muted-foreground">{code}</span>
        <span className="text-sm text-muted-foreground">
          {currentSlideIndex + 1} / {slides.length}
        </span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-lg">
          {currentSlide.type === 'poll' ? (
            <PollSlide slide={currentSlide} onSubmit={handleSubmit} disabled={alreadyAnswered} />
          ) : (
            <OpenEndedSlide slide={currentSlide} onSubmit={handleSubmit} disabled={alreadyAnswered} />
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
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      {children}
    </div>
  )
}

export default function AudiencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AudienceView />
    </Suspense>
  )
}
