import PresentationEditor from '@/components/presentations/PresentationEditor'

export default function NewPresentationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New presentation</h1>
      <PresentationEditor />
    </div>
  )
}
