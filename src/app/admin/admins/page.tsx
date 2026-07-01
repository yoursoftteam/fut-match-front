'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2, Trash2, Mail, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ShieldAlert } from 'lucide-react'

interface AdminEntry {
  user_id: string
  email: string
  created_at: string
}

export default function AdminsPage() {
  const { user, loading, isAdmin } = useAuth()
  const [admins, setAdmins] = useState<AdminEntry[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchAdmins = async () => {
    setLoadingAdmins(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/admins')
      const json = await res.json()
      if (json.success) {
        setAdmins(json.data.admins)
      } else {
        setError(json.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoadingAdmins(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchAdmins()
    else setLoadingAdmins(false)
  }, [isAdmin])

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setAdding(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/v1/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(`Administrador agregado: ${json.data.email}`)
        setNewEmail('')
        fetchAdmins()
      } else {
        setError(json.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al agregar')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar a ${email} como administrador?`)) return
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/v1/admin/admins?user_id=${userId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setSuccess(`Administrador eliminado: ${email}`)
        fetchAdmins()
      } else {
        setError(json.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-destructive" />
          <p className="mt-4 text-lg font-medium">Acceso denegado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo administradores pueden gestionar admins.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 pt-8">
      <div className="flex items-center gap-3">
        <UserPlus className="size-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administradores</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestiona quiénes tienen acceso al panel de administración
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Agregar administrador</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Email del usuario"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAdd} disabled={adding || !newEmail.trim()}>
              {adding ? <><Loader2 className="size-3.5 animate-spin" /> Agregando…</> : <><Plus className="size-3.5" /> Agregar</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Administradores actuales</h2>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay administradores registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {admins.map((admin) => (
                <li key={admin.user_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-4 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {admin.user_id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(admin.user_id, admin.email)}
                    disabled={admins.length <= 1}
                    title={admins.length <= 1 ? 'Debe haber al menos un admin' : 'Eliminar'}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
