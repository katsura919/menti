"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function JoinPage() {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setError("Join code must be 6 characters")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from("presentations")
      .select("id")
      .eq("join_code", trimmed)
      .single()

    if (fetchError || !data) {
      setError("Presentation not found")
      setLoading(false)
      return
    }

    const params = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : ""
    router.push(`/join/${trimmed}${params}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-beige-50">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-beige-200 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-beige-300/70 blur-3xl" />

      <div className="section-container relative flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-lg">
          <div className="card shadow-elegant border-beige-200 bg-white/95 p-7 md:p-9">
            <div className="mb-7 text-center">
              <p className="text-xs tracking-[0.16em] text-taupe-400 uppercase">
                TalentMucho Live
              </p>
              <h1 className="mt-2 font-serif text-4xl font-light text-charcoal-900">
                Join Session
              </h1>
              <p className="mt-2 text-sm text-taupe-400">
                Enter your 6-character code to participate.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-charcoal-900">
                  Join Code
                </label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  required
                  className="h-14 rounded-xl border-2 border-beige-200 bg-beige-50 text-center font-mono text-2xl tracking-[0.25em] text-charcoal-900 uppercase focus-visible:border-clay-500 focus-visible:ring-clay-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-charcoal-900">
                  Display Name{" "}
                  <span className="font-normal text-taupe-400">(optional)</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  className="h-11 rounded-xl border-2 border-beige-200 bg-beige-50 text-charcoal-900 focus-visible:border-clay-500 focus-visible:ring-clay-500/20"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.trim().length !== 6}
                className="h-11 w-full rounded-xl bg-clay-500 text-beige-50 hover:bg-clay-600"
              >
                {loading ? "Joining..." : "Join Now"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-taupe-400">
              <span className="rounded-full border border-beige-300 px-2 py-1">
                Live Polls
              </span>
              <span className="rounded-full border border-beige-300 px-2 py-1">
                Open Q&A
              </span>
              <span className="rounded-full border border-beige-300 px-2 py-1">
                Realtime
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
