import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Presentation } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: presentations } = await supabase
    .from('presentations')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Presentations</h1>
        <Button asChild>
          <Link href="/presentations/new">New presentation</Link>
        </Button>
      </div>

      {!presentations || presentations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No presentations yet.</p>
      ) : (
        <div className="grid gap-3">
          {presentations.map((p: Presentation) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  Code: <span className="font-mono">{p.join_code}</span>
                  {p.is_active && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Live
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/presentations/${p.id}/edit`}>Edit</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/presentations/${p.id}/present`}>Present</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
