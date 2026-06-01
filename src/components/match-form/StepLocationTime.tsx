"use client";

import { useController } from "react-hook-form";
import { MapPinIcon, ChevronRightIcon } from "lucide-react";

import { useMatchFormContext } from "@/contexts/MatchFormContext";
import { useMatchFormNavigation } from "@/hooks/useMatchFormNavigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/form/FieldGroup";
import { formatTimeAmPm } from "@/lib/date-utils";

interface StepLocationTimeProps {
  stepNumber: number;
}

export default function StepLocationTime({ stepNumber }: StepLocationTimeProps) {
  const { control, formId, formState: { errors } } = useMatchFormContext();
  const { handleNext, isNavigating, isStepActive } = useMatchFormNavigation();

  const { field: locationField } = useController({ name: "location", control });
  const { field: noLocationYetField } = useController({ name: "noLocationYet", control });
  const { field: dateField } = useController({ name: "date", control });
  const { field: timeField } = useController({ name: "time", control });
  const noLocationYet = Boolean(noLocationYetField.value);
  const hasValidLocation = typeof locationField.value === "string" && locationField.value.trim().length >= 3;

  const isValid =
    isStepActive(stepNumber) &&
    (noLocationYet || hasValidLocation) &&
    Boolean(dateField.value) &&
    Boolean(timeField.value);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MapPinIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Dónde & Cuándo</h2>
            <p className="text-sm text-muted-foreground">Define el lugar y horario del partido</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              noLocationYet ? "max-h-0 opacity-0 -translate-y-1" : "max-h-36 opacity-100 translate-y-0"
            }`}
            aria-hidden={noLocationYet}
          >
            <FieldGroup
              id="location"
              label="Lugar del Partido"
              error={errors.location?.message}
            >
              <Input
                id={`${formId}-location`}
                placeholder="Ej: Cancha Central, Cra 15 #82-30"
                autoComplete="street-address"
                aria-invalid={!!errors.location}
                required={!noLocationYet}
                disabled={noLocationYet}
                {...locationField}
              />
            </FieldGroup>
          </div>

          <label
            htmlFor={`${formId}-no-location-yet`}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
          >
            <input
              id={`${formId}-no-location-yet`}
              type="checkbox"
              checked={noLocationYet}
              onChange={(event) => {
                noLocationYetField.onChange(event.target.checked);
                if (event.target.checked) {
                  locationField.onChange("");
                }
              }}
              className="h-4 w-4 rounded border-border bg-background accent-primary"
            />
            Aún no tenemos lugar
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup
            id="date"
            label="Fecha"
            error={errors.date?.message}
          >
            <div className="relative">
              <Input
                id={`${formId}-date`}
                type="date"
                className="appearance-none"
                aria-invalid={!!errors.date}
                {...dateField}
              />
            </div>
            {dateField.value && (
              <p className="mt-1.5 text-xs font-medium text-primary" aria-live="polite">
                {new Date(`${dateField.value}T12:00:00`).toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            )}
          </FieldGroup>

          <FieldGroup
            id="time"
            label="Hora"
            error={errors.time?.message}
          >
            <div className="relative">
              <Input
                id={`${formId}-time`}
                type="time"
                className="appearance-none"
                aria-invalid={!!errors.time}
                {...timeField}
              />
            </div>
            {timeField.value && (
              <p className="mt-1.5 text-xs font-medium text-primary" aria-live="polite">
                {formatTimeAmPm(String(timeField.value))}
              </p>
            )}
          </FieldGroup>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleNext} disabled={!isValid || isNavigating}>
            Continuar
            <ChevronRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}