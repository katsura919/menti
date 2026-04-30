import type { Beat } from '@/os/config'

interface Props {
  beats: Beat[]
  activeIdx: number
  onSelect: (idx: number) => void
}

export default function BeatTabs({ beats, activeIdx, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {beats.map((beat, i) => (
        <button
          key={beat.id}
          onClick={() => onSelect(i)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 ${
            i === activeIdx
              ? 'bg-clay-500 text-beige-50'
              : 'bg-beige-200 text-charcoal-700 hover:bg-beige-300'
          }`}
        >
          {beat.title}
        </button>
      ))}
    </div>
  )
}
