'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Mail, AtSign, Save, ArrowLeft, Shield, X } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { POSITIONS, type PositionOption } from '@/lib/positions'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const SHARED_POSITIONS = POSITIONS as readonly PositionOption[]

  const [alias, setAlias] = useState('')
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const hasChanges = useMemo(() => {
    if (!user) return false
    const metadata = user.user_metadata as Record<string, unknown> | null
    return (
      alias !== ((metadata?.alias as string) || '') ||
      fullName !== ((metadata?.full_name as string) || '') ||
      position !== ((metadata?.position as string) || '')
    )
  }, [user, alias, fullName, position])

  useEffect(() => {
    if (!message || messageType === 'error') return
    const t = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(t)
  }, [message, messageType])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const metadata = user.user_metadata as Record<string, unknown> | null
    setAlias((metadata?.alias as string) || '')
    setFullName((metadata?.full_name as string) || '')
    setPosition((metadata?.position as string) || '')
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-xl mx-auto px-4 py-8 sm:py-10">
          <div className="h-4 w-32 animate-pulse rounded bg-muted mb-6" />
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="size-16 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            ))}
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  const email = user.email ?? ''
  const metadata = user.user_metadata as Record<string, unknown> | null
  const initialAlias = (metadata?.alias as string) || ''
  const initialName = (metadata?.full_name as string) || ''
  const initial = (initialAlias || initialName || email[0] || '?').charAt(0).toUpperCase()

  const handleSave = async () => {
    const trimmedAlias = alias.trim()
    const trimmedFullName = fullName.trim()
    if (trimmedAlias.length < 2) {
      setMessage('El alias debe tener al menos 2 caracteres.')
      setMessageType('error')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          alias: trimmedAlias,
          name: trimmedAlias,
          full_name: trimmedFullName,
          position: position || null,
        },
      })

      if (error) throw error

      if (user.id && position) {
        await supabase
          .from('match_registrations')
          .update({ position })
          .eq('user_id', user.id)
      }
      if (position && trimmedAlias) {
        await supabase
          .from('match_registrations')
          .update({ position })
          .is('user_id', null)
          .ilike('name', trimmedAlias)
      }

      setMessage('Perfil actualizado correctamente.')
      setMessageType('success')
    } catch {
      setMessage('No pudimos guardar los cambios. Intenta nuevamente.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setAlias(initialAlias)
    setFullName(initialName)
    setPosition((metadata?.position as string) || '')
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-xl mx-auto px-4 py-8 sm:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-3.5" />
          Volver al dashboard
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {/* Avatar + header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-heading font-bold text-primary">{initial}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-heading font-bold text-foreground leading-tight">
                Mi Perfil
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Administra tu información personal
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="size-3.5" />
                Correo electrónico
              </label>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground">
                {email}
              </div>
            </div>

            {/* Nombre completo */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <AtSign className="size-3.5" />
                Nombre completo
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre real"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se muestra en el saludo del dashboard.
              </p>
            </div>

            {/* Alias */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Save className="size-3.5" />
                Alias <span className="text-red-400">*</span>
              </label>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ejemplo: El 10"
                autoComplete="nickname"
                maxLength={30}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tu apodo en la cancha. Mínimo 2 caracteres.
              </p>
            </div>

            {/* Posición */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Shield className="size-3.5" />
                Posición en la cancha
              </label>
              <Select value={position} onValueChange={(v) => { setPosition(v && v !== '__none__' ? v : ''); }}>
                <SelectTrigger className="w-full" aria-label="Seleccionar posición">
                  <SelectValue placeholder="Selecciona tu posición…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin posición</SelectItem>
                  {SHARED_POSITIONS.map((pos) => {
                    const Icon = pos.icon
                    return (
                      <SelectItem key={pos.value} value={pos.value}>
                        <Icon className="size-4" aria-hidden="true" />
                        {pos.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Ayuda a los capitanes a reconocer tu puesto al inscribirte.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={saving || !hasChanges} className="flex-1">
              <Save className="size-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {hasChanges && (
              <Button type="button" variant="outline" onClick={handleDiscard} disabled={saving} className="shrink-0">
                <X className="size-4" />
                Cancelar
              </Button>
            )}
          </div>
        </section>

        {/* Toast flotante */}
        {message && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg border transition-all duration-300 ${
              messageType === 'success'
                ? 'bg-green-900 text-green-100 border-green-700/50'
                : 'bg-red-900 text-red-100 border-red-700/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="size-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
