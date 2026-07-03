"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { TournamentScheduleDay, WeekDay } from "@/lib/tournament-schema"

function toAmPm(hhmm: string): string {
  const [h] = hhmm.split(":").map(Number)
  if (h === undefined) return hhmm
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:00 ${period}`
}

const dayOptions: Array<{ value: WeekDay; label: string }> = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
]

const timeBlocks = [
  { label: "Mañana", range: `${toAmPm("06:00")} – ${toAmPm("11:00")}`, times: ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"] },
  { label: "Tarde", range: `${toAmPm("12:00")} – ${toAmPm("17:00")}`, times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
  { label: "Noche", range: `${toAmPm("18:00")} – ${toAmPm("23:00")}`, times: ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
]

interface TournamentSchedulePickerProps {
  value: TournamentScheduleDay[]
  onChange: (value: TournamentScheduleDay[]) => void
}

function blockKey(dayOfWeek: WeekDay, blockLabel: string) {
  return `${dayOfWeek}-${blockLabel}`
}

export function TournamentSchedulePicker({ value, onChange }: TournamentSchedulePickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const sortedValue = useMemo(
    () => [...value].sort((left, right) => left.day_of_week - right.day_of_week),
    [value]
  )

  const toggleDay = (dayOfWeek: WeekDay) => {
    const exists = value.some((item) => item.day_of_week === dayOfWeek)
    if (exists) {
      onChange(value.filter((item) => item.day_of_week !== dayOfWeek))
      return
    }
    onChange([...value, { day_of_week: dayOfWeek, times: [] }])
  }

  const toggleTime = (dayOfWeek: WeekDay, time: string) => {
    onChange(
      value.map((item) => {
        if (item.day_of_week !== dayOfWeek) return item
        const active = item.times.includes(time)
        return {
          ...item,
          times: active ? item.times.filter((t) => t !== time) : [...item.times, time],
        }
      })
    )
  }

  const toggleBlock = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const selectedSummary = sortedValue.length
    ? sortedValue
        .map((item) => {
          const label = dayOptions.find((o) => o.value === item.day_of_week)?.label ?? "Día"
          const times = item.times.length > 0 ? item.times.map(toAmPm).join(", ") : "sin horarios"
          return `${label}: ${times}`
        })
        .join(" • ")
    : "Sin días configurados"

  return (
    <section className="space-y-4 rounded-xl border border-border bg-background/70 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Cronograma por día</p>
        <p className="text-xs text-muted-foreground">
          Puedes configurar horarios distintos para cada día o dejarlo vacío y hacerlo después.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {dayOptions.map((day) => {
          const active = value.some((item) => item.day_of_week === day.value)
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {day.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {sortedValue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Elige un día para empezar a agregar horarios.
          </div>
        ) : (
          sortedValue.map((day) => {
            const dayLabel = dayOptions.find((o) => o.value === day.day_of_week)?.label ?? "Día"
            return (
              <div key={day.day_of_week} className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{dayLabel}</p>
                  <button
                    type="button"
                    onClick={() => toggleDay(day.day_of_week)}
                    className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    Quitar día
                  </button>
                </div>

                <div className="mt-3 space-y-1">
                  {timeBlocks.map((block) => {
                    const key = blockKey(day.day_of_week, block.label)
                    const isOpen = expanded.has(key)
                    const selectedCount = block.times.filter((t) => day.times.includes(t)).length
                    return (
                      <div key={block.label} className="rounded-lg border border-border/60">
                        <button
                          type="button"
                          onClick={() => toggleBlock(key)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                        >
                          <span>
                            {block.label}{" "}
                            <span className="font-normal text-muted-foreground">{block.range}</span>
                            {selectedCount > 0 && (
                              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                                {selectedCount}
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            className={`size-3.5 transition ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="grid grid-cols-3 gap-1.5 border-t border-border/60 px-3 py-2 sm:grid-cols-6">
                            {block.times.map((time) => {
                              const active = day.times.includes(time)
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => toggleTime(day.day_of_week, time)}
                                  className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                                    active
                                      ? "border-primary bg-primary/15 text-foreground"
                                      : "border-border text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {toAmPm(time)}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">{selectedSummary}</p>
    </section>
  )
}
