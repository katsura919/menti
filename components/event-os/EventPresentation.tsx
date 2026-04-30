'use client'

import { useState } from 'react'
import { SEGMENTS } from '@/os/config'
import SegmentNav from './SegmentNav'
import BeatTabs from './BeatTabs'
import SlideContent from './SlideContent'
import WorkbookBlock from './WorkbookBlock'

export default function EventPresentation() {
  const [segIdx, setSegIdx] = useState(0)
  const [beatIdx, setBeatIdx] = useState(0)

  const seg = SEGMENTS[segIdx]
  const beat = seg.beats[beatIdx] ?? seg.beats[0]

  const bullets = beat.blocks.filter((b) => b.type === 'bullets')
  const workbooks = beat.blocks.filter((b) => b.type === 'workbook')

  function selectSegment(i: number) {
    setSegIdx(i)
    setBeatIdx(0)
  }

  return (
    <div className="flex gap-6">
      <SegmentNav segments={SEGMENTS} activeIdx={segIdx} onSelect={selectSegment} />

      <div className="min-w-0 flex-1 space-y-4">
        {/* Segment header */}
        <div className="rounded-xl border border-beige-200 bg-white p-6 shadow-sm">
          <span className="font-mono text-xs text-taupe-400">
            {seg.num} · {seg.duration}
          </span>
          <h2
            className="mt-1 font-serif text-2xl font-light text-charcoal-900"
            dangerouslySetInnerHTML={{
              __html:
                seg.title +
                (seg.titleItalic ? ` <em>${seg.titleItalic}</em>` : ''),
            }}
          />
          <p className="mt-1 text-sm text-taupe-400">{seg.subtitle}</p>
        </div>

        {/* Beat tabs */}
        <BeatTabs beats={seg.beats} activeIdx={beatIdx} onSelect={setBeatIdx} />

        {/* Slide + workbook content */}
        <div className="space-y-6 rounded-xl border border-beige-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-xl font-light text-charcoal-900">
            {beat.title}
          </h3>

          <SlideContent bullets={bullets} />

          {workbooks.length > 0 && (
            <div className="space-y-3 border-t border-beige-200 pt-5">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-taupe-400">
                Interactive Slots
              </p>
              {workbooks.map((block, i) => (
                <WorkbookBlock key={i} text={block.text ?? ''} />
              ))}
            </div>
          )}

          {bullets.length === 0 && workbooks.length === 0 && (
            <p className="text-sm text-taupe-400">
              No slide content for this beat.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
