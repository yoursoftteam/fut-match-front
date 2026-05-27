"use client"

import { useMemo } from "react"
import type { TournamentScheduleDay, WeekDay } from "@/lib/tournament-schema"

const dayOptions: Array<{ value: WeekDay; label: string }> = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
]

const timeOptions = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]

interface TournamentSchedulePickerProps {
  value: TournamentScheduleDay[]
  onChange: (value: TournamentScheduleDay[]) => void
}

export function TournamentSchedulePicker({ value, onChange }: TournamentSchedulePickerProps) {
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
          times: active ? item.times.filter((itemTime) => itemTime !== time) : [...item.times, time],
        }
      })
    )
  }

  const selectedSummary = sortedValue.length
    ? sortedValue
        .map((item) => {
          const label = dayOptions.find((option) => option.value === item.day_of_week)?.label ?? "Día"
          return `${label}: ${item.times.length > 0 ? item.times.join(", ") : "sin horarios"}`
        })
        .join(" • ")
    : "Sin días configurados"

  return (
    <section className="space-y-4 rounded-xl border border-border bg-background/70 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Cronograma por día</p>
        <p className="text-xs text-muted-foreground">Puedes configurar horarios distintos para cada día o dejarlo vacío y hacerlo después.</p>
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
            const label = dayOptions.find((option) => option.value === day.day_of_week)?.label ?? "Día"
            return (
              <div key={day.day_of_week} className="rounded-lg border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <button
                    type="button"
                    onClick={() => toggleDay(day.day_of_week)}
                    className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    Quitar día
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {timeOptions.map((time) => {
                    const active = day.times.includes(time)
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => toggleTime(day.day_of_week, time)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {time}
                      </button>
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
