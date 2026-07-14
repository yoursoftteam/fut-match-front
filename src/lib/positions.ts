import { Shield, Gauge, Crosshair, Hand, type LucideIcon } from 'lucide-react'

export interface PositionOption {
  value: string
  label: string
  abbr: string
  icon: LucideIcon
}

export const POSITIONS = [
  { value: 'portero', label: 'Portero', abbr: 'POR', icon: Hand },
  { value: 'defensa', label: 'Defensa', abbr: 'DEF', icon: Shield },
  { value: 'centrocampista', label: 'Centrocampista', abbr: 'MC', icon: Gauge },
  { value: 'delantero', label: 'Delantero', abbr: 'DEL', icon: Crosshair },
] as const satisfies readonly PositionOption[]
