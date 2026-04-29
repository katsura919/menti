"use client"

import { useRouter } from "next/navigation"
import PresentationEditor from "@/components/presentations/PresentationEditor"
import { Button } from "@/components/ui/button"

export default function NewPresentationPage() {
  const router = useRouter()

  function submitForm() {
    ;(
      document.getElementById("presentation-form") as HTMLFormElement
    )?.requestSubmit()
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h1 className="font-serif text-3xl font-light text-charcoal-900">
          New Presentation
        </h1>
        <p className="mt-1 text-sm text-taupe-400">
          Create slides, polls, and open-ended questions for your session.
        </p>
      </header>

      <div className="card p-6">
        <PresentationEditor />
      </div>

      {/* Action row outside the card */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={submitForm}
          className="bg-clay-500 px-6 text-beige-50 hover:bg-clay-600"
        >
          Create presentation
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
