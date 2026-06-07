'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PoolRanking } from './PoolRanking'
import { TournamentPredictions } from './TournamentPredictions'
import { PoolMatches } from './PoolMatches'
import { ShareActions } from '@/components/ShareLink'
import { ArrowLeft, ClipboardList, Globe, Lock, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'ranking' | 'matches' | 'tournament'

interface PoolDetailData {
  id: string
  tournament_id: string
  owner_id: string
  name: string
  competition_type: string
  visibility: string
  invite_code: string
  created_at: string
  config_active: Record<string, unknown>
  total_participants: number
}

interface PoolDetailViewProps {
  poolId: string
}

export function PoolDetailView({ poolId }: PoolDetailViewProps) {
  const router = useRouter()
  const [pool, setPool] = useState<PoolDetailData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ranking')

  const fallbackPath = '/bet/pools'
  const [listPath, setListPath] = useState(fallbackPath)
  const [listLabel, setListLabel] = useState('Mis Pollas')

  const fetchPool = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) {
        router.push(`/auth?mode=signin&redirect_to=/bet/pools/${poolId}`)
        return
      }
      setUserId(authData.session?.user?.id ?? null)
      const response = await fetch(`/api/v1/bet/pools/${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) {
        setPool(result.data)
        const isPredComp = result.data.competition_type === 'predictions'
        setListPath(isPredComp ? '/bet/predictions' : '/bet/pools')
        setListLabel(isPredComp ? 'Mis competencias' : 'Mis Pollas')
      } else {
        setError(result.error?.message || 'Error al cargar la polla')
      }
    } catch {
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }, [poolId, router])

  useEffect(() => {
    fetchPool()
  }, [fetchPool])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-[#22C55E]" />
      </div>
    )
  }

  if (error || !pool) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <p className="text-red-500">{error || 'Polla no encontrada'}</p>
          <button
            type="button"
            onClick={() => router.push(pool ? listPath : fallbackPath)}
            className="rounded-lg bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Volver
          </button>
      </div>
    )
  }

  const isOwner = userId === pool.owner_id

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'matches', label: 'Partidos', icon: ClipboardList },
    { id: 'tournament', label: 'Predicciones', icon: Globe },
  ]

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteUrl = `${baseUrl}/join/${pool.invite_code}`

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push(listPath)}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {listLabel}
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold">{pool.name}</h1>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {pool.visibility === 'public' ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                  {pool.visibility === 'public' ? 'Pública' : 'Privada'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {pool.total_participants} participante{pool.total_participants !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <ShareActions
              copyText={inviteUrl}
              copyTooltip="Copiar invitación"
              copiedStatusText="Invitación copiada"
              whatsappText={`¡Unite a mi polla "${pool.name}"! ${inviteUrl}`}
              emailSubject={`Invitación a "${pool.name}"`}
              emailBody={`Te invito a participar en "${pool.name}": ${inviteUrl}`}
              nativeShare={{
                title: pool.name,
                text: `¡Unite a mi polla "${pool.name}"!`,
                url: inviteUrl,
              }}
            />
          </div>
        </div>

        <div className="mb-6 flex border-b border-border" role="tablist">
          {tabs.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={tab === tabId}
              onClick={() => setTab(tabId)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                tab === tabId
                  ? 'border-[#22C55E] text-[#22C55E]'
                  : 'border-transparent text-muted-foreground hover:text-foreground/80'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'ranking' && (
          <PoolRanking poolId={pool.id} poolName={pool.name} isOwner={isOwner} />
        )}

        {tab === 'matches' && (
          <PoolMatches poolId={pool.id} tournamentId={pool.tournament_id} />
        )}

        {tab === 'tournament' && <TournamentPredictions poolId={pool.id} />}
      </div>
    </div>
  )
}
