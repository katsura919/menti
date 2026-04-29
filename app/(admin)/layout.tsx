import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './components/LogoutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-svh bg-beige-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-beige-200 bg-white shadow-sm">
        <div className="section-container flex items-center justify-between py-4">
          <h1 className="font-serif text-2xl font-light tracking-tight text-charcoal-900">
            Menti
          </h1>
          <LogoutButton />
        </div>
      </header>

      {/* Main */}
      <main className="section-container py-8">
        {children}
      </main>
    </div>
  )
}
