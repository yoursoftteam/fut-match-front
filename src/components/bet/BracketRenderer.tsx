'use client'

import { useEffect, useRef, useState } from 'react'

export interface BracketRendererProps {
  tournament: { id: string; name: string }
  qualified: {
    group_stage: Array<{ group: string; position: number; team: string }>
    round_of_32: string[]
    quarter_finals: string[]
    semi_finals: string[]
    third_place: [string, string]
    final: [string, string]
  }
  predictions: { home_team: string; away_team: string }[]
}

export function BracketRenderer({
  tournament,
  qualified,
  predictions,
}: BracketRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const animateLines = () => {
      const paths = svgRef.current?.querySelectorAll('path')
      paths?.forEach((path) => {
        const length = path.getTotalLength()
        path.style.strokeDasharray = String(length)
        path.style.strokeDashoffset = String(length)
        path.style.transition = 'stroke-dashoffset 1.5s ease-out'
        setTimeout(() => {
          path.style.strokeDashoffset = '0'
        }, 100)
      })
    }

    animateLines()
  }, [qualified])

  const width = 1000
  const height = 600
  const teamsPerColumn = [16, 8, 4, 2, 1]
  const columnX = [50, 250, 450, 650, 850]

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full min-w-max"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {/* Round of 32 */}
        {qualified.round_of_32.map((team, i) => (
          <g key={`r16-${i}`}>
            <rect
              x="20"
              y={`${50 + i * 33}`}
              width="100"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
            <text
              x="70"
              y={`${68 + i * 33}`}
              textAnchor="middle"
              className="cursor-pointer fill-foreground text-xs hover:fill-emerald-500"
              onClick={() => setSelectedTeam(team)}
              aria-label={`Round of 32: ${team}`}
            >
              {team.substring(0, 10)}
            </text>
          </g>
        ))}

        {/* Quarter Finals */}
        {qualified.quarter_finals.map((team, i) => (
          <g key={`qf-${i}`}>
            <rect
              x="220"
              y={`${100 + i * 66}`}
              width="100"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
            <text
              x="270"
              y={`${118 + i * 66}`}
              textAnchor="middle"
              className="cursor-pointer fill-foreground text-xs hover:fill-emerald-500"
              onClick={() => setSelectedTeam(team)}
              aria-label={`Quarter Finals: ${team}`}
            >
              {team.substring(0, 10)}
            </text>
          </g>
        ))}

        {/* Semi Finals */}
        {qualified.semi_finals.map((team, i) => (
          <g key={`sf-${i}`}>
            <rect
              x="420"
              y={`${150 + i * 132}`}
              width="100"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
            <text
              x="470"
              y={`${168 + i * 132}`}
              textAnchor="middle"
              className="cursor-pointer fill-foreground text-xs hover:fill-emerald-500"
              onClick={() => setSelectedTeam(team)}
              aria-label={`Semi Finals: ${team}`}
            >
              {team.substring(0, 10)}
            </text>
          </g>
        ))}

        {/* Final */}
        {qualified.final[0] && (
          <g>
            <rect
              x="620"
              y="150"
              width="100"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-emerald-500/50"
            />
            <text
              x="670"
              y="168"
              textAnchor="middle"
              className="cursor-pointer fill-foreground text-xs hover:fill-emerald-500"
              onClick={() => setSelectedTeam(qualified.final[0])}
              aria-label={`Final: ${qualified.final[0]}`}
            >
              {qualified.final[0].substring(0, 10)}
            </text>
          </g>
        )}

        {qualified.final[1] && (
          <g>
            <rect
              x="620"
              y="300"
              width="100"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-emerald-500/50"
            />
            <text
              x="670"
              y="318"
              textAnchor="middle"
              className="cursor-pointer fill-foreground text-xs font-bold hover:fill-emerald-500"
              onClick={() => setSelectedTeam(qualified.final[1])}
              aria-label={`Final: ${qualified.final[1]}`}
            >
              {qualified.final[1].substring(0, 10)}
            </text>
          </g>
        )}

        {/* Champion */}
        <circle
          cx="850"
          cy="225"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-emerald-500/30"
        />
        <text
          x="850"
          y="230"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          Champion
        </text>
      </svg>

      {selectedTeam && (
        <div className="mt-4 rounded-md bg-muted p-2 text-sm text-foreground">
          Selected: <span className="font-semibold text-emerald-400">{selectedTeam}</span>
        </div>
      )}
    </div>
  )
}
