'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { WordFrequency } from '@/lib/wordUtils'

const WordCloud = dynamic(() => import('react-d3-cloud'), { ssr: false })

interface Props {
  words: WordFrequency[]
}

const FILL_COLORS = [
  '#c4704a', // terracotta
  '#5b7fa6', // muted blue
  '#7a9e5e', // sage green
  '#b5635a', // dusty rose
  '#8b6bb1', // muted purple
  '#c49a3c', // warm gold
  '#4a8b8b', // teal
  '#b87333', // copper
  '#6b9e7a', // mint
  '#a0522d', // sienna
]

function hashColor(text: string | undefined): string {
  if (!text) return FILL_COLORS[0]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff
  }
  return FILL_COLORS[Math.abs(hash) % FILL_COLORS.length]
}

export default function WordCloudDisplay({ words }: Props) {
  const maxCount = useMemo(
    () => Math.max(...words.map((w) => w.count), 1),
    [words]
  )
  const minCount = useMemo(
    () => Math.min(...words.map((w) => w.count), 1),
    [words]
  )

  const data = useMemo(
    () => words.map((w) => ({ text: w.word, value: w.count })),
    [words]
  )

  if (words.length === 0) {
    return (
      <p className="pt-8 text-center text-sm text-muted-foreground">
        Waiting for responses...
      </p>
    )
  }

  return (
    <div className="w-full" style={{ height: 360 }}>
      <WordCloud
        data={data}
        width={620}
        height={360}
        font="Manrope, ui-sans-serif, sans-serif"
        fontWeight="700"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fontSize={(word: any) => {
          const range = maxCount - minCount || 1
          const ratio = Math.pow((word.value - minCount) / range, 0.6)
          return Math.round(16 + ratio * 68)
        }}
        rotate={0}
        padding={6}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fill={(word: any) => hashColor(word.text)}
        random={() => 0.5}
      />
    </div>
  )
}
