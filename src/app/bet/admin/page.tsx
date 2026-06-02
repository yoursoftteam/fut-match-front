'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dice1, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID

interface SimResult {
  match_id: string
  home_team?: string
  away_team?: string
  home_score: number
  away_score: number
  status: 'simulated' | 'skipped' | 'error'
  error?: string
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [results, setResults] = useState<SimResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.id === ADMIN_USER_ID

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/auth?mode=signin')
      return
    }

    if (!isAdmin) return

    const now = new Date().toISOString()
    supabase
      .from('bet_matches')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'finished')
      .lt('kickoff_at', now)
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [user, authLoading, isAdmin, router])

  const handleSimulate = async () => {
    setSimulating(true)
    setError(null)
    setResults(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setError('No hay sesión activa')
      setSimulating(false)
      return
    }

    try {
      const res = await fetch('/api/v1/bet/simulate-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()

      if (!body.success) {
        setError(body.error ?? 'Error al simular')
      } else {
        setResults(body.data.results)
        setPendingCount(null)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSimulating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShieldAlert className="size-12 text-destructive" />
            <p className="text-lg font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground">
              Solo el administrador puede acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const simulated = results?.filter(r => r.status === 'simulated').length ?? 0
  const skipped = results?.filter(r => r.status === 'skipped').length ?? 0
  const errs = results?.filter(r => r.status === 'error').length ?? 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin — Simular Resultados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera resultados automáticos para partidos pasados sin marcar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Estado actual</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Partidos pendientes de resultado:{' '}
            <span className="font-semibold text-foreground">
              {pendingCount === null ? '—' : pendingCount}
            </span>
          </p>

          <Button
            onClick={handleSimulate}
            disabled={simulating || (pendingCount !== null && pendingCount === 0)}
          >
            {simulating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Simulando…
              </>
            ) : (
              <>
                <Dice1 className="size-4" />
                Simular resultados pendientes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Resultado de la simulación</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-400">✓ {simulated} simulados</span>
              {skipped > 0 && <span className="text-muted-foreground">— {skipped} omitidos</span>}
              {errs > 0 && <span className="text-destructive">✗ {errs} errores</span>}
            </div>

            {results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2 pr-4">Local</th>
                      <th className="pb-2 pr-4">Visitante</th>
                      <th className="pb-2 pr-4">Marcador</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.match_id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">{r.home_team ?? '—'}</td>
                        <td className="py-2 pr-4">{r.away_team ?? '—'}</td>
                        <td className="py-2 pr-4 font-mono">
                          {r.status === 'simulated'
                            ? `${r.home_score} – ${r.away_score}`
                            : '—'}
                        </td>
                        <td className="py-2">
                          {r.status === 'simulated' && (
                            <span className="text-emerald-400">Simulado</span>
                          )}
                          {r.status === 'skipped' && (
                            <span className="text-muted-foreground">Omitido</span>
                          )}
                          {r.status === 'error' && (
                            <span className="text-destructive" title={r.error}>
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
