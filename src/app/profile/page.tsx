'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User, Mail, AtSign, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [alias, setAlias] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(t)
  }, [message])

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
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-r-transparent mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const email = user.email ?? ''

  const handleSave = async () => {
    const trimmedAlias = alias.trim()
    const trimmedFullName = fullName.trim()
    if (trimmedAlias.length < 2) {
      setMessage('El alias debe tener al menos 2 caracteres.')
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
        },
      })

      if (error) throw error
      setMessage('Perfil actualizado correctamente.')
      setMessageType('success')
    } catch {
      setMessage('No pudimos guardar los cambios. Intenta nuevamente.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 py-8 sm:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-3.5" />
          Volver al dashboard
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-foreground leading-tight">
                Mi Perfil
              </h1>
              <p className="text-xs text-muted-foreground">
                Administra tu información personal
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="size-3.5" />
                Correo electrónico
              </label>
              <Input value={email} disabled className="opacity-60" />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <User className="size-3.5" />
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

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <AtSign className="size-3.5" />
                Alias
              </label>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ejemplo: El 10"
                autoComplete="nickname"
                maxLength={30}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tu apodo en la cancha. Si es igual a tu nombre completo, el dashboard te pedirá que lo personalices.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {message && (
              <div
                className={`rounded-lg p-3 text-sm text-center transition-opacity duration-300 ${
                  messageType === 'success'
                    ? 'bg-green-900/60 text-green-200 border border-green-700/40'
                    : 'bg-red-900/60 text-red-200 border border-red-700/40'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
