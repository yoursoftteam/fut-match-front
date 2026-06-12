'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PoolRanking } from './PoolRanking'
import { TournamentPredictions } from './TournamentPredictions'
import { PoolMatches } from './PoolMatches'
import { ShareActions } from '@/components/ShareLink'
import { PoolRules } from './PoolRules'
import { MatchCard } from './MatchCard'
import { ArrowLeft, Calendar, Clock, FileText, Globe, Lock, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'ranking' | 'matches' | 'tournament' | 'rules'

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
  const searchParams = useSearchParams()
  const tabRef = useRef<HTMLDivElement>(null)
  const validTabs: Tab[] = useMemo(() => ['ranking', 'matches', 'tournament', 'rules'], [])
  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get('tab') as Tab | null
    return fromUrl && validTabs.includes(fromUrl) ? fromUrl : 'ranking'
  })
  const [nextKickoffAt, setNextKickoffAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const [nextMatch, setNextMatch] = useState<{
    id: string
    home_team: { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
    away_team: { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
    kickoff_at: string
    status: string
    home_score_official?: number | null
    away_score_official?: number | null
    stage: string
    group_name?: string | null
  } | null>(null)
  const [nextPrediction, setNextPrediction] = useState<{ home_score_predicted: number; away_score_predicted: number } | null>(null)

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

  useEffect(() => {
    if (!pool) return
    let cancelled = false
    ;(async () => {
      const { data: authData } = await supabase.auth.getSession()
      const uid = authData.session?.user?.id

      const { data } = await supabase
        .from('bet_matches')
        .select('id, tournament_id, kickoff_at, status, stage, group_name, home_team_id, away_team_id')
        .eq('tournament_id', pool.tournament_id)
        .gte('kickoff_at', new Date().toISOString())
        .order('kickoff_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (cancelled || !data) return

      setNextKickoffAt(data.kickoff_at)

      // Fetch team info
      const [{ data: home }, { data: away }] = await Promise.all([
        supabase.from('bet_teams').select('id, name, fifa_code, flag_svg_url').eq('id', data.home_team_id).maybeSingle(),
        supabase.from('bet_teams').select('id, name, fifa_code, flag_svg_url').eq('id', data.away_team_id).maybeSingle(),
      ])
      if (cancelled) return

      // Fetch user prediction
      if (uid) {
        const { data: pred } = await supabase
          .from('bet_match_predictions')
          .select('home_score_predicted, away_score_predicted')
          .eq('match_id', data.id)
          .eq('pool_id', pool.id)
          .eq('user_id', uid)
          .eq('mode', 'pool')
          .maybeSingle()
        if (cancelled) return
        if (pred) setNextPrediction(pred)
      }

      setNextMatch({
        id: data.id,
        home_team: home ?? null,
        away_team: away ?? null,
        kickoff_at: data.kickoff_at,
        status: data.status,
        stage: data.stage ?? '',
        group_name: data.group_name,
      })
    })()
    return () => { cancelled = true }
  }, [pool])

  useEffect(() => {
    if (!nextKickoffAt) return
    const tick = () => {
      const diff = new Date(nextKickoffAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown(''); setNextKickoffAt(null); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      const parts: string[] = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${hours}h`)
      parts.push(`${minutes}m`)
      parts.push(`${seconds}s`)
      setCountdown(parts.join(' '))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextKickoffAt])

  const isPredictions = pool?.competition_type === 'predictions'

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = useMemo(
    () => [
      { id: 'ranking', label: 'Ranking', icon: Trophy },
      { id: 'matches', label: 'Partidos', icon: Calendar },
      ...(isPredictions ? [] : [{ id: 'tournament' as const, label: 'Predicciones' as const, icon: Globe as typeof Trophy }]),
      { id: 'rules', label: 'Reglas', icon: FileText },
    ],
    [isPredictions]
  )

  const switchTab = useCallback(
    (newTab: Tab) => {
      setTab(newTab)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', newTab)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

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

          <div className="space-y-2">
            <h1 className="truncate text-2xl font-bold">{pool.name}</h1>
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
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-nowrap">
              <span className="flex items-center gap-1 whitespace-nowrap">
                {pool.visibility === 'public' ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                {pool.visibility === 'public' ? 'Pública' : 'Privada'}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Users className="size-3.5" />
                <span>{pool.total_participants}</span>
                <span>participante{pool.total_participants !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </div>
        </div>

        {nextMatch && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm">
              <Clock className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="text-muted-foreground">Próximo partido:</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-400">{countdown}</span>
            </div>
            <MatchCard
              match={{
                id: nextMatch.id,
                home_team: {
                  name: nextMatch.home_team?.name ?? 'TBD',
                  fifa_code: nextMatch.home_team?.fifa_code ?? '---',
                  flag_svg_url: nextMatch.home_team?.flag_svg_url ?? '',
                },
                away_team: {
                  name: nextMatch.away_team?.name ?? 'TBD',
                  fifa_code: nextMatch.away_team?.fifa_code ?? '---',
                  flag_svg_url: nextMatch.away_team?.flag_svg_url ?? '',
                },
                kickoff_at: nextMatch.kickoff_at,
                stage: nextMatch.stage,
                group_name: nextMatch.group_name ?? undefined,
                status: (nextMatch.status === 'live' || nextMatch.status === 'finished' ? nextMatch.status : 'scheduled') as 'scheduled' | 'live' | 'finished',
                home_score_official: nextMatch.home_score_official ?? null,
                away_score_official: nextMatch.away_score_official ?? null,
              }}
              prediction={nextPrediction ?? undefined}
              canEdit={true}
              onUpdatePrediction={async (home, away) => {
                setNextPrediction({ home_score_predicted: home, away_score_predicted: away })
                const { data: authData } = await supabase.auth.getSession()
                const token = authData.session?.access_token
                if (!token) return
                await fetch('/api/v1/bet/predictions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    match_id: nextMatch.id,
                    home_score_predicted: home,
                    away_score_predicted: away,
                    pool_id: pool.id,
                  }),
                })
              }}
              compact
            />
          </div>
        )}

        <div
          ref={tabRef}
          className="mb-6 overflow-x-auto sm:overflow-visible"
          role="tablist"
          aria-orientation="horizontal"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const idx = tabs.findIndex((t) => t.id === tab)
            const next = e.key === 'ArrowRight'
              ? (idx + 1) % tabs.length
              : (idx - 1 + tabs.length) % tabs.length
            switchTab(tabs[next].id)
            const btn = tabRef.current?.querySelector<HTMLButtonElement>(`[role="tab"]:nth-child(${next + 1})`)
            btn?.focus()
          }}
        >
          <div className="flex gap-1 border-b border-border min-w-max sm:min-w-0">
            {tabs.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={tab === tabId}
                tabIndex={tab === tabId ? 0 : -1}
                onClick={() => switchTab(tabId)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors max-sm:px-2.5',
                  'touch-action-manipulation',
                  tab === tabId
                    ? 'border-[#22C55E] text-[#22C55E]'
                    : 'border-transparent text-muted-foreground hover:text-foreground/80'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'ranking' && (
          <PoolRanking poolId={pool.id} poolName={pool.name} isOwner={isOwner} />
        )}

        {tab === 'matches' && (
          <PoolMatches poolId={pool.id} tournamentId={pool.tournament_id} showGroupTable={!isPredictions} />
        )}

        {tab === 'tournament' && <TournamentPredictions poolId={pool.id} />}

        {tab === 'rules' && <PoolRules competitionType={pool.competition_type} config={pool.config_active} />}
      </div>
    </div>
  )
}
