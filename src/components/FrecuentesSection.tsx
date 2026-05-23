"use client"

import { Heart } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import FrecuenteCard from "@/components/FrecuenteCard"

export default function FrecuentesSection() {
  const { templates, loading } = useFrecuentes()
  const isInitialLoading = loading && templates.length === 0
  const isRefreshing = loading && templates.length > 0

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">
          Tus Frecuentes
        </h2>
        {isRefreshing && (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-primary animate-pulse" aria-hidden />
            Actualizando...
          </span>
        )}
      </div>

      {isInitialLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando plantillas…</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-10 text-center">
          <Heart className="size-10 text-red-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            Sin partidos frecuentes
          </h3>
          <p className="text-muted-foreground text-sm">
            Guarda un partido recurrente como plantilla para usarlo después.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
          {templates.map((t) => (
            <FrecuenteCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </section>
  )
}
