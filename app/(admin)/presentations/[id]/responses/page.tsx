import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ResponsesManager from '@/components/presentations/ResponsesManager'
import type { Slide } from '@/lib/types'

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: presentation } = await supabase
    .from('presentations')
    .select('*, slides(*)')
    .eq('id', id)
    .single()

  if (!presentation) notFound()

  const slides: Slide[] = (presentation.slides ?? []).sort(
    (a: Slide, b: Slide) => a.order_index - b.order_index
  )

  const slideIds = slides.map((s) => s.id)

  const { data: responses } = slideIds.length
    ? await supabase
        .from('responses')
        .select('*, participant:participants(display_name, email)')
        .in('slide_id', slideIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/presentations/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-taupe-400 hover:text-clay-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to edit
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-light text-charcoal-900">
          {presentation.title}
        </h1>
        <p className="mt-1 text-sm text-taupe-400">
          {responses?.length ?? 0} total response{responses?.length !== 1 ? 's' : ''} across {slides.length} slide{slides.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ResponsesManager slides={slides} initialResponses={responses ?? []} />
    </div>
  )
}
