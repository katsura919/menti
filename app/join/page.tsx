'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setError('Join code must be 6 characters')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('presentations')
      .select('id')
      .eq('join_code', trimmed)
      .single()

    if (fetchError || !data) {
      setError('Presentation not found')
      setLoading(false)
      return
    }

    const params = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : ''
    router.push(`/join/${trimmed}${params}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">Join Session</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Join Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              required
              className="w-full px-3 py-3 border rounded-lg bg-background text-foreground uppercase tracking-widest text-center text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Display Name{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  )
}
