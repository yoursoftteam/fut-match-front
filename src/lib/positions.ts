import { Shield, Gauge, Crosshair, type LucideIcon } from 'lucide-react'

export interface PositionOption {
  value: string
  label: string
  icon: LucideIcon
}

export const POSITIONS = [
  { value: 'portero', label: 'Portero', icon: Shield },
  { value: 'defensa', label: 'Defensa', icon: Shield },
  { value: 'centrocampista', label: 'Centrocampista', icon: Gauge },
  { value: 'delantero', label: 'Delantero', icon: Crosshair },
] as const satisfies readonly PositionOption[]
