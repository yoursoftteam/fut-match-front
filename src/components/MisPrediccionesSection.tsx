'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePools } from '@/hooks/usePools'
import { PublicPoolsModal } from '@/components/bet'
import { Target, Trophy, Compass, ChevronRight } from 'lucide-react'

export default function MisPrediccionesSection() {
  const router = useRouter()
  const { pools, loading, totalCount: poolCount } = usePools({
    competitionType: 'pool',
    redirectOnUnauth: false,
  })
  const {
    pools: competitions,
    loading: compLoading,
    totalCount: compCount,
  } = usePools({
    competitionType: 'predictions',
    redirectOnUnauth: false,
  })

  const [showPublicModal, setShowPublicModal] = useState(false)

  const isLoading = loading || compLoading
  const allItems = [...pools, ...competitions].slice(0, 3)
  const hasItems = allItems.length > 0
  const totalItems = poolCount + compCount

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">
            Mis Predicciones
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowPublicModal(true)}
          className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
        >
          <Compass className="size-3.5" />
          Explorar
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-r-transparent mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Cargando predicciones…</p>
        </div>
      ) : hasItems ? (
        <div className="space-y-2">
          {allItems.map((item) => {
            const isPool = item.competition_type === 'pool'
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  router.push(isPool ? `/bet/pools/${item.id}` : `/bet/predictions/${item.id}`)
                }
                className="w-full rounded-xl border border-border bg-card h-12 px-3 text-left transition-all hover:border-primary/40 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 h-full">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPool
                        ? 'bg-accent/10 text-accent'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {isPool ? (
                      <Trophy className="size-4" />
                    ) : (
                      <Target className="size-4" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-card-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors leading-none">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {isPool ? 'Polla' : 'Predicciones'}
                    {' · '}
                    {item.member_count}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-0.5" />
                </div>
              </button>
            )
          })}

          {totalItems > 3 && (
            <button
              type="button"
              onClick={() => router.push('/bet')}
              className="w-full flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
            >
              Ver todas en Predicciones →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push('/bet/predictions/new')}
            className="rounded-xl border border-border bg-card p-3 text-center group cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-1.5 group-hover:bg-primary/20 transition-colors">
              <Target className="size-4 text-primary" />
            </div>
            <p className="text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors leading-tight">
              Crear Predicciones
            </p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/bet/pools/new')}
            className="rounded-xl border border-border bg-card p-3 text-center group cursor-pointer hover:border-accent/30 transition-colors"
          >
            <div className="size-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-1.5 group-hover:bg-accent/20 transition-colors">
              <Trophy className="size-4 text-accent" />
            </div>
            <p className="text-xs font-semibold text-card-foreground group-hover:text-accent transition-colors leading-tight">
              Crear Polla
            </p>
          </button>
        </div>
      )}

      {/* Mobile explore */}
      {hasItems && (
        <div className="sm:hidden mt-2">
          <button
            type="button"
            onClick={() => setShowPublicModal(true)}
            className="w-full flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Compass className="size-3.5" />
            Explorar públicas
          </button>
        </div>
      )}

      <PublicPoolsModal
        open={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        competitionType="pool"
      />
    </section>
  )
}
