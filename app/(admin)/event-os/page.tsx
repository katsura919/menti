import EventPresentation from '@/components/event-os/EventPresentation'

export default function EventOSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-serif text-4xl font-light tracking-tight text-charcoal-900">
          Event Presentation
        </h1>
        <p className="text-taupe-400">Claude for Business · Live Event</p>
      </div>
      <EventPresentation />
    </div>
  )
}
