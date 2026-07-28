"use client"

import { useMemo, useState } from "react"
import { Check, Copy, ExternalLink, Globe, Link2, Wallet } from "lucide-react"

interface TournamentDynamicLinksCardProps {
  tournamentId: string
}

export function TournamentDynamicLinksCard({ tournamentId }: TournamentDynamicLinksCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const links = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        register: `/tournaments/${tournamentId}/register`,
        payment: `/tournaments/${tournamentId}/register?mode=pay`,
        portal: `/tournaments/${tournamentId}`,
      }
    }

    const origin = window.location.origin
    return {
      register: `${origin}/tournaments/${tournamentId}/register`,
      payment: `${origin}/tournaments/${tournamentId}/register?mode=pay`,
      portal: `${origin}/tournaments/${tournamentId}`,
    }
  }, [tournamentId])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch {
      setCopiedKey(null)
    }
  }

  const items = [
    {
      key: "register",
      label: "Inscripción pública",
      value: links.register,
      icon: ExternalLink,
    },
    {
      key: "payment",
      label: "Pago directo",
      value: links.payment,
      icon: Wallet,
    },
    {
      key: "portal",
      label: "Portal público",
      value: links.portal,
      icon: Globe,
    },
  ] as const

  const CopyIcon = copiedKey ? Check : Copy

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="dynamic-links-heading">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary">
          <Link2 className="size-4" />
        </div>
        <div>
          <h2 id="dynamic-links-heading" className="text-base font-heading font-bold text-foreground">
            Compartir
          </h2>
          <p className="text-xs text-muted-foreground">Copia rápido los enlaces del torneo.</p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon
          const isCopied = copiedKey === item.key

          return (
            <li
              key={item.key}
              className={`group rounded-lg border bg-background/50 p-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03] ${
                isCopied ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Icon className="size-3.5" />
                  {item.label}
                </p>
                <div className="flex items-center gap-1">
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${item.label}`}
                    className="inline-flex items-center rounded-md border border-border p-1.5 text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(item.key, item.value)}
                    aria-label={`Copiar ${item.label}`}
                    className={`inline-flex items-center rounded-md border p-1.5 text-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isCopied
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <CopyIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
