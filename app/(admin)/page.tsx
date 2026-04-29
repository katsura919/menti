import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import type { Presentation } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: presentations } = await supabase
    .from("presentations")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 font-serif text-4xl font-light tracking-tight text-charcoal-900">
            Presentations
          </h1>
          <p className="text-taupe-400">
            {presentations?.length || 0} presentation
            {presentations?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/presentations/new"
          className="btn-primary inline-flex justify-center px-6 py-3 text-base font-medium"
        >
          + New Presentation
        </Link>
      </div>

      {/* Content */}
      {!presentations || presentations.length === 0 ? (
        <div className="card border-2 border-dashed py-12 text-center">
          <p className="mb-2 text-taupe-400">No presentations yet</p>
          <p className="text-sm text-taupe-400">Create one to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {presentations.map((p: Presentation) => (
            <div
              key={p.id}
              className="card group transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex flex-col gap-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="mb-1 font-serif text-xl font-light text-charcoal-900 transition-colors group-hover:text-clay-500">
                      {p.title}
                    </h3>
                    <p className="font-mono text-sm text-taupe-400">
                      {p.join_code}
                    </p>
                  </div>
                  {p.is_active && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium whitespace-nowrap text-green-700">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500"></span>
                      Live
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-beige-200 pt-2">
                  <Link
                    href={`/presentations/${p.id}/edit`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-beige-100 px-4 py-2 text-sm font-medium text-clay-600 transition-colors duration-200 hover:bg-beige-200"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/present/${p.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-clay-500 px-4 py-2 text-sm font-medium text-beige-50 transition-colors duration-200 hover:bg-clay-600"
                  >
                    Present
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
