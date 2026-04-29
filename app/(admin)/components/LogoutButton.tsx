"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg px-4 py-2 text-sm font-medium text-taupe-400 transition-all duration-200 hover:bg-beige-100 hover:text-clay-500"
    >
      Sign Out
    </button>
  )
}
