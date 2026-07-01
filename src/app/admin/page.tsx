'use client'

import { ShieldCheck, Trophy, Users, Settings, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

const sections = [
  {
    title: 'Resultados de Torneos',
    description: 'Actualiza marcadores de partidos y gestiona resultados de predicciones y pollas',
    href: '/admin/bet',
    icon: Trophy,
  },
  {
    title: 'Administradores',
    description: 'Gestiona quiénes tienen acceso al panel de administración',
    href: '/admin/admins',
    icon: UserPlus,
  },
]

export default function AdminDashboard() {
  const { user, loading, isAdmin } = useAuth()

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
          <ShieldCheck className="mx-auto size-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium">Acceso restringido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo administradores autorizados.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pt-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestiona la plataforma
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="group cursor-pointer border-border/60 p-6 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                    <Icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
