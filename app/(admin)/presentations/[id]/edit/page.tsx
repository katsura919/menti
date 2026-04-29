import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PresentationEditor from '@/components/presentations/PresentationEditor'
import type { Slide } from '@/lib/types'

export default async function EditPresentationPage({
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

  presentation.slides = (presentation.slides ?? []).sort(
    (a: Slide, b: Slide) => a.order_index - b.order_index
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit presentation</h1>
      <PresentationEditor presentation={presentation} />
    </div>
  )
}
