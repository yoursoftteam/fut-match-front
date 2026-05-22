"use client"

import type { ReactNode } from "react"

interface GroupedMatch {
  id: string
  title: string
  location: string
  date: string
  max_players: number
  players_per_team: number
  field_cost: number
  rental_cost: number
  has_rented_goalkeepers: boolean
  rented_goalkeepers_count: number
  source_template_id?: string | null
  source_template?: { id: string; name: string } | null
}

interface MatchGroup {
  templateId: string
  templateName: string
  matches: GroupedMatch[]
}

interface MatchGroupedListProps {
  matches: GroupedMatch[]
  registrationCounts: Record<string, number>
  renderCard: (match: GroupedMatch, registeredCount: number, isFull: boolean, isGrouped: boolean) => ReactNode
}

function groupMatchesByTemplate(matches: GroupedMatch[]): {
  groups: MatchGroup[]
  standalone: GroupedMatch[]
} {
  const groupsMap = new Map<string, GroupedMatch[]>()
  const standalone: GroupedMatch[] = []

  for (const match of matches) {
    if (match.source_template_id && match.source_template) {
      const existing = groupsMap.get(match.source_template_id) || []
      existing.push(match)
      groupsMap.set(match.source_template_id, existing)
    } else {
      standalone.push(match)
    }
  }

  const groups: MatchGroup[] = []
  for (const [templateId, groupMatches] of groupsMap) {
    groups.push({
      templateId,
      templateName: groupMatches[0].source_template?.name || "Plantilla",
      matches: groupMatches.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    })
  }

  groups.sort((a, b) => {
    const aLatest = new Date(a.matches[0].date).getTime()
    const bLatest = new Date(b.matches[0].date).getTime()
    return bLatest - aLatest
  })

  return { groups, standalone }
}

export default function MatchGroupedList({
  matches,
  registrationCounts,
  renderCard,
}: MatchGroupedListProps) {
  const { groups, standalone } = groupMatchesByTemplate(matches)

  return (
    <>
      {groups.map((group) => (
        <section key={group.templateId} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
              {group.templateName}
            </h3>
            <span className="text-xs text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full">
              {group.matches.length} partido{group.matches.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
            {group.matches.map((match) => {
              const count = registrationCounts[match.id] || 0
              return <div key={match.id}>{renderCard(match, count, count >= match.max_players, true)}</div>
            })}
          </div>
        </section>
      ))}

      {standalone.length > 0 && (
        <section>
          {groups.length > 0 && (
            <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Otros partidos
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
            {standalone.map((match) => {
              const count = registrationCounts[match.id] || 0
              return <div key={match.id}>{renderCard(match, count, count >= match.max_players, false)}</div>
            })}
          </div>
        </section>
      )}
    </>
  )
}
