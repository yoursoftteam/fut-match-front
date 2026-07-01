"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { TournamentCreateWizard } from "@/components/tournaments/TournamentCreateWizard"

export default function NewTournamentClient() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth")
    }
  }, [loading, router, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Volver al dashboard
        </Link>

        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Modo admin</p>
          <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-heading font-bold text-foreground sm:text-3xl">
            <Trophy className="size-6 text-primary" />
            Nuevo torneo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Build rápido: crea, comparte y empieza la reta.</p>
        </header>

        <TournamentCreateWizard />
      </main>
    </div>
  )
}
