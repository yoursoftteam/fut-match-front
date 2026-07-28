"use client"

import { useMemo, useState } from "react"
import type { TournamentScheduleDay, WeekDay } from "@/lib/tournament-schema"

function toAmPm(hhmm: string): string {
  const [h] = hhmm.split(":").map(Number)
  if (h === undefined) return hhmm
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:00 ${period}`
}

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hhmm = `${String(i).padStart(2, "0")}:00`
  return { value: hhmm, label: toAmPm(hhmm) }
})

const dayOptions: Array<{ value: WeekDay; label: string }> = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
]

interface TournamentSchedulePickerProps {
  value: TournamentScheduleDay[]
  onChange: (value: TournamentScheduleDay[]) => void
}

function DayRow({
  day,
  dayLabel,
  onAddTime,
  onRemoveTime,
  onRemoveDay,
}: {
  day: TournamentScheduleDay
  dayLabel: string
  onAddTime: (dayOfWeek: WeekDay, hhmm: string) => void
  onRemoveTime: (dayOfWeek: WeekDay, time: string) => void
  onRemoveDay: (dayOfWeek: WeekDay) => void
}) {
  const [selectedTime, setSelectedTime] = useState("09:00")

  const selectClass =
    "h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground transition focus:border-primary/50 focus:outline-none"

  return (
    <div
      className={`rounded-lg border bg-background px-4 py-3 ${
        day.times.length === 0 ? "border-red-500/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{dayLabel}</p>
        <button
          type="button"
          onClick={() => onRemoveDay(day.day_of_week)}
          className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          Quitar día
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className={selectClass}
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAddTime(day.day_of_week, selectedTime)}
          className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95"
        >
          Agregar
        </button>
      </div>

      {day.times.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {day.times.map((time) => (
            <span
              key={time}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              {toAmPm(time)}
              <button
                type="button"
                onClick={() => onRemoveTime(day.day_of_week, time)}
                className="ml-0.5 text-muted-foreground transition hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
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

  const addTime = (dayOfWeek: WeekDay, hhmm: string) => {
    onChange(
      value.map((item) => {
        if (item.day_of_week !== dayOfWeek) return item
        if (item.times.includes(hhmm)) return item
        return { ...item, times: [...item.times, hhmm].sort() }
      })
    )
  }

  const removeTime = (dayOfWeek: WeekDay, time: string) => {
    onChange(
      value.map((item) => {
        if (item.day_of_week !== dayOfWeek) return item
        return { ...item, times: item.times.filter((t) => t !== time) }
      })
    )
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
              <DayRow
                key={day.day_of_week}
                day={day}
                dayLabel={dayLabel}
                onAddTime={addTime}
                onRemoveTime={removeTime}
                onRemoveDay={toggleDay}
              />
            )
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">{selectedSummary}</p>
    </section>
  )
}
