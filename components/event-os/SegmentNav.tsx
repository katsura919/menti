import type { Segment } from '@/os/config'

interface Props {
  segments: Segment[]
  activeIdx: number
  onSelect: (idx: number) => void
}

export default function SegmentNav({ segments, activeIdx, onSelect }: Props) {
  return (
    <nav className="w-52 shrink-0 space-y-1">
      <p className="mb-3 px-3 font-mono text-xs font-bold uppercase tracking-widest text-taupe-400">
        Segments
      </p>
      {segments.map((seg, i) => (
        <button
          key={seg.id}
          onClick={() => onSelect(i)}
          className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
            i === activeIdx
              ? 'bg-clay-500 text-beige-50'
              : 'text-charcoal-900 hover:bg-beige-200'
          }`}
        >
          <span
            className={`block font-mono text-xs ${
              i === activeIdx ? 'opacity-70' : 'text-taupe-400'
            }`}
          >
            {seg.num}
          </span>
          <span
            className="block text-sm font-medium leading-snug"
            dangerouslySetInnerHTML={{
              __html:
                seg.title +
                (seg.titleItalic ? ` <em>${seg.titleItalic}</em>` : ''),
            }}
          />
        </button>
      ))}
    </nav>
  )
}
