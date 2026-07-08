'use client'

import { usePools } from '@/hooks/usePools'
import { useRouter } from 'next/navigation'
import { Target, Trophy, ChevronRight } from 'lucide-react'

function ItemCard({ item }: { item: { id: string; name: string; competition_type: string; member_count: number } }) {
  const router = useRouter()
  const isPool = item.competition_type === 'pool'
  return (
    <button
      type="button"
      onClick={() => router.push(isPool ? `/bet/pools/${item.id}` : `/bet/predictions/${item.id}`)}
      className="w-full rounded-xl border border-border bg-card h-12 px-3 text-left transition-all hover:border-primary/40 group cursor-pointer"
    >
      <div className="flex items-center gap-2.5 h-full">
        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${isPool ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
          {isPool ? <Trophy className="size-4" /> : <Target className="size-4" />}
        </div>
        <span className="text-sm font-semibold text-card-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors leading-none">
          {item.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {item.member_count} miembro{item.member_count !== 1 ? 's' : ''}
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-0.5" />
      </div>
    </button>
  )
}

export function PrediccionesTab() {
  const router = useRouter()
  const { pools: poolsData, loading: poolsLoading } = usePools({ competitionType: 'pool', redirectOnUnauth: false })
  const { pools: predsData, loading: predsLoading } = usePools({ competitionType: 'predictions', redirectOnUnauth: false })

  const isLoading = poolsLoading || predsLoading

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Cargando predicciones…</p>
      </div>
    )
  }

  const hasPredictions = predsData.length > 0
  const hasPools = poolsData.length > 0

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          Predicciones
        </p>
        <h2 className="text-2xl font-heading font-bold text-foreground">
          Tus predicciones y pollas
        </h2>
      </div>

      {/* Creación */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Crear nuevo
        </h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push('/bet/predictions/new')}
            className="flex items-center gap-3 rounded-xl border border-border bg-card h-12 px-4 transition-all hover:border-primary/40 group cursor-pointer w-full"
          >
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Target className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-card-foreground flex-1 min-w-0 group-hover:text-primary transition-colors leading-none text-left">
              Crear Predicciones
            </span>
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Solo marcadores</span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-1" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/bet/pools/new')}
            className="flex items-center gap-3 rounded-xl border border-border bg-card h-12 px-4 transition-all hover:border-primary/40 group cursor-pointer w-full"
          >
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Trophy className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-card-foreground flex-1 min-w-0 group-hover:text-primary transition-colors leading-none text-left">
              Crear Polla
            </span>
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Apuesta con amigos</span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-1" />
          </button>
        </div>
      </section>

      {/* Mis Predicciones Inscritas */}
      <section>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-1">
          Mis Predicciones Inscritas
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          {hasPredictions ? `${predsData.length} prediccion${predsData.length !== 1 ? 'es' : ''}` : 'Sin predicciones aún'}
        </p>
        {hasPredictions ? (
          <div className="space-y-2">
            {predsData.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-3">
              <Target className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              No estás inscrito en ninguna predicción. Creá una nueva o unite a una existente.
            </p>
          </div>
        )}
      </section>

      {/* Mis Pollas Inscritas */}
      <section>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-1">
          Mis Pollas Inscritas
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          {hasPools ? `${poolsData.length} polla${poolsData.length !== 1 ? 's' : ''}` : 'Sin pollas aún'}
        </p>
        {hasPools ? (
          <div className="space-y-2">
            {poolsData.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-3">
              <Trophy className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              No estás inscrito en ninguna polla. Creá una nueva o unite a una existente.
            </p>
          </div>
        )}
      </section>

    </div>
  )
}
