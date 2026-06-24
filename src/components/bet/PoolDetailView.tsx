'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PoolRanking } from './PoolRanking'
import { TournamentPredictions } from './TournamentPredictions'
import { PoolMatches } from './PoolMatches'
import { GroupStandingsModal } from './GroupStandingsModal'
import { ShareActions } from '@/components/ShareLink'
import { PoolRules } from './PoolRules'
import { MatchDayCarousel, type CarouselMatchData } from './MatchDayCarousel'
import { ArrowLeft, Calendar, FileText, Globe, Lock, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Match, Team } from '@/types/bet'

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
  const [carouselData, setCarouselData] = useState<{
    matches: CarouselMatchData[]
    initialIndex: number
    predictions: Record<string, { home_score_predicted: number; away_score_predicted: number } | null>
  } | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupStandings, setGroupStandings] = useState<{
    matches: GroupStandingsMatch[]
    predictions: Map<string, { home_score_predicted: number; away_score_predicted: number }>
  } | null>(null)

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

      const now = new Date()
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      let { data: matchRows } = await supabase
        .from('bet_matches')
        .select('id, tournament_id, kickoff_at, status, stage, group_name, home_team_id, away_team_id, home_score_official, away_score_official')
        .eq('tournament_id', pool.tournament_id)
        .gte('kickoff_at', dayStart.toISOString())
        .lte('kickoff_at', dayEnd.toISOString())
        .order('kickoff_at', { ascending: true })
      if (cancelled) return

      if (!matchRows || matchRows.length === 0) {
        const broadStart = new Date(now.getTime() - 12 * 60 * 60 * 1000)
        const broadEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000)
        const { data: broadRows } = await supabase
          .from('bet_matches')
          .select('id, tournament_id, kickoff_at, status, stage, group_name, home_team_id, away_team_id, home_score_official, away_score_official')
          .eq('tournament_id', pool.tournament_id)
          .gte('kickoff_at', broadStart.toISOString())
          .lte('kickoff_at', broadEnd.toISOString())
          .order('kickoff_at', { ascending: true })
        if (cancelled) return
        matchRows = broadRows
      }

      if (!matchRows || matchRows.length === 0) return

      const allTeamIds = [...new Set(matchRows.flatMap(m => [m.home_team_id, m.away_team_id]))]
      const [{ data: teams }] = await Promise.all([
        supabase.from('bet_teams').select('id, name, fifa_code, flag_svg_url').in('id', allTeamIds),
      ])
      if (cancelled) return

      const teamMap = new Map((teams ?? []).map(t => [t.id, t]))

      const matchIds = matchRows.map(m => m.id)
      const predictionsMap: Record<string, { home_score_predicted: number; away_score_predicted: number } | null> = {}
      if (uid) {
        const { data: preds } = await supabase
          .from('bet_match_predictions')
          .select('match_id, home_score_predicted, away_score_predicted')
          .in('match_id', matchIds)
          .eq('pool_id', pool.id)
          .eq('user_id', uid)
          .eq('mode', 'pool')
        if (cancelled) return
        for (const p of preds ?? []) {
          predictionsMap[p.match_id] = { home_score_predicted: p.home_score_predicted, away_score_predicted: p.away_score_predicted }
        }
      }

      const matches: CarouselMatchData[] = matchRows.map(m => {
        const homeTeam = teamMap.get(m.home_team_id)
        const awayTeam = teamMap.get(m.away_team_id)
        return {
          id: m.id,
          home_team: {
            name: homeTeam?.name ?? 'TBD',
            fifa_code: homeTeam?.fifa_code ?? '---',
            flag_svg_url: homeTeam?.flag_svg_url ?? '',
          },
          away_team: {
            name: awayTeam?.name ?? 'TBD',
            fifa_code: awayTeam?.fifa_code ?? '---',
            flag_svg_url: awayTeam?.flag_svg_url ?? '',
          },
          kickoff_at: m.kickoff_at,
          stage: m.stage ?? '',
          group_name: m.group_name ?? undefined,
          status: (m.status === 'live' || m.status === 'finished' ? m.status : 'scheduled') as 'scheduled' | 'live' | 'finished',
          home_score_official: m.home_score_official ?? null,
          away_score_official: m.away_score_official ?? null,
        }
      })

      const nowMs = now.getTime()
      const nextIdx = matches.findIndex(m =>
        m.status !== 'finished' && new Date(m.kickoff_at).getTime() > nowMs - 100 * 60 * 1000
      )
      const initialIndex = nextIdx >= 0 ? nextIdx : matches.length - 1

      setCarouselData({ matches, initialIndex, predictions: predictionsMap })
    })()
    return () => { cancelled = true }
  }, [pool])

  type GroupStandingsMatch = Match & {
    home_team?: Team | null
    away_team?: Team | null
  }

  useEffect(() => {
    if (!selectedGroup || !pool) {
      setGroupStandings(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data: authData } = await supabase.auth.getSession()
      const uid = authData.session?.user?.id
      if (!uid) return

      const { data: matchRows } = await supabase
        .from('bet_matches')
        .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
        .eq('tournament_id', pool.tournament_id)
        .eq('group_name', selectedGroup)
      if (cancelled || !matchRows) return

      const matchIds = matchRows.map(m => m.id)
      const predMap = new Map<string, { home_score_predicted: number; away_score_predicted: number }>()
      if (matchIds.length > 0) {
        const { data: preds } = await supabase
          .from('bet_match_predictions')
          .select('match_id, home_score_predicted, away_score_predicted')
          .in('match_id', matchIds)
          .eq('pool_id', pool.id)
          .eq('user_id', uid)
          .eq('mode', 'pool')
        if (cancelled) return
        for (const p of preds ?? []) {
          predMap.set(p.match_id, { home_score_predicted: p.home_score_predicted, away_score_predicted: p.away_score_predicted })
        }
      }

      if (!cancelled) {
        setGroupStandings({ matches: matchRows as GroupStandingsMatch[], predictions: predMap })
      }
    })()
    return () => { cancelled = true }
  }, [selectedGroup, pool])

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

        {carouselData && (
          <MatchDayCarousel
            matches={carouselData.matches}
            initialIndex={carouselData.initialIndex}
            predictions={carouselData.predictions}
            onUpdatePrediction={async (matchId, home, away) => {
              setCarouselData(prev => {
                if (!prev) return prev
                return {
                  ...prev,
                  predictions: { ...prev.predictions, [matchId]: { home_score_predicted: home, away_score_predicted: away } }
                }
              })
              const { data: authData } = await supabase.auth.getSession()
              const token = authData.session?.access_token
              if (!token) return
              await fetch('/api/v1/bet/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  match_id: matchId,
                  home_score_predicted: home,
                  away_score_predicted: away,
                  pool_id: pool.id,
                }),
              })
            }}
            poolId={pool.id}
            showGroupTable={!isPredictions}
            onShowGroup={setSelectedGroup}
          />
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
                    ? 'border-emerald-500 text-emerald-500'
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

      {selectedGroup && groupStandings && (
        <GroupStandingsModal
          groupName={selectedGroup}
          matches={groupStandings.matches}
          getPrediction={(matchId) => groupStandings.predictions.get(matchId)}
          onClose={() => setSelectedGroup(null)}
        />
      )}
      </div>
    </div>
  )
}
