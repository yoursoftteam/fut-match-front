"use client";

import { useController } from "react-hook-form";
import { MapPinIcon, CalendarIcon, ClockIcon, ChevronRightIcon } from "lucide-react";

import { useMatchFormContext } from "@/contexts/MatchFormContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/form/FieldGroup";

interface StepLocationTimeProps {
  onNext: () => void;
  isValid: boolean;
}

export default function StepLocationTime({ onNext, isValid }: StepLocationTimeProps) {
  const { currentStep, formId, control, formState: { errors } } = useMatchFormContext();
  const isActive = currentStep === 1;
  const isPast = currentStep > 1;

  const { field: locationField } = useController({ name: "location", control });
  const { field: dateField } = useController({ name: "date", control });
  const { field: timeField } = useController({ name: "time", control });

  return (
    <Card
      className={isActive || isPast ? "opacity-100 grayscale-0" : "opacity-40 grayscale pointer-events-none"}
      aria-hidden={!isActive && !isPast}
    >
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
            {...locationField}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup
            id="date"
            label="Fecha"
            error={errors.date?.message}
          >
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`${formId}-date`}
                type="date"
                className="pl-10"
                aria-invalid={!!errors.date}
                {...dateField}
              />
            </div>
          </FieldGroup>

          <FieldGroup
            id="time"
            label="Hora"
            error={errors.time?.message}
          >
            <div className="relative">
              <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id={`${formId}-time`}
                type="time"
                className="pl-10"
                aria-invalid={!!errors.time}
                {...timeField}
              />
            </div>
          </FieldGroup>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={onNext} disabled={!isValid}>
            Continuar
            <ChevronRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
