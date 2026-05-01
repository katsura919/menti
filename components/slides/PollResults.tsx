"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import type { Slide, Response } from "@/lib/types"

interface Props {
  slide: Slide
  responses: Response[]
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

export default function PollResults({ slide, responses }: Props) {
  const options = slide.options ?? []
  const data = options.map((opt, i) => ({
    name: opt,
    count: responses.filter((r) => r.answer === opt).length,
    color: COLORS[i % COLORS.length],
  }))

  const total = responses.length

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-end">
        <span className="text-muted-foreground shrink-0 text-sm">
          {total} {total === 1 ? "response" : "responses"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--color-taupe-400)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--color-taupe-400)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(value) => [value ?? 0, "votes"]}
            contentStyle={{
              background: "var(--beige-50)",
              border: "1px solid var(--beige-200)",
              borderRadius: "12px",
              color: "var(--charcoal-900)",
            }}
            labelStyle={{ color: "var(--clay-600)" }}
            itemStyle={{ color: "var(--charcoal-900)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
