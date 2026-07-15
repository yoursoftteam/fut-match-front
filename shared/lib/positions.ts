export interface PositionOption {
  value: string
  label: string
  abbr: string
}

export const POSITIONS = [
  { value: 'portero', label: 'Portero', abbr: 'POR' },
  { value: 'defensa', label: 'Defensa', abbr: 'DEF' },
  { value: 'centrocampista', label: 'Centrocampista', abbr: 'MC' },
  { value: 'delantero', label: 'Delantero', abbr: 'DEL' },
] as const satisfies readonly PositionOption[]
