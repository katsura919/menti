import type { Block } from '@/os/config'

interface Props {
  bullets: Block[]
}

export default function SlideContent({ bullets }: Props) {
  if (bullets.length === 0) return null

  return (
    <div className="space-y-4">
      {bullets.map((block, i) => (
        <ul key={i} className="space-y-2.5">
          {block.items?.map((item, j) => (
            <li key={j} className="flex gap-3 leading-relaxed text-charcoal-900">
              <span className="mt-1 shrink-0 text-clay-500">•</span>
              <span dangerouslySetInnerHTML={{ __html: item }} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
