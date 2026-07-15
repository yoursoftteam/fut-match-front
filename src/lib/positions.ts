import { POSITIONS as SHARED_POSITIONS, type PositionOption as SharedPositionOption } from '@shared/lib/positions'
import { Shield, Swords, UserRound, CircleDot } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface PositionOption extends SharedPositionOption {
  icon: LucideIcon
}

const ICON_MAP: Record<string, LucideIcon> = {
  portero: Shield,
  defensa: Swords,
  centrocampista: UserRound,
  delantero: CircleDot,
}

export const POSITIONS = SHARED_POSITIONS.map(p => ({
  ...p,
  icon: ICON_MAP[p.value] ?? CircleDot,
})) as readonly PositionOption[]
