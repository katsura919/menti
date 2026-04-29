import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PresenterView from '@/components/PresenterView'
import type { Slide } from '@/lib/types'

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: presentation } = await supabase
    .from('presentations')
    .select('*, slides(*)')
    .eq('id', id)
    .single()

  if (!presentation) notFound()

  presentation.slides = (presentation.slides ?? []).sort(
    (a: Slide, b: Slide) => a.order_index - b.order_index
  )

  return <PresenterView presentation={presentation} slides={presentation.slides} />
}
