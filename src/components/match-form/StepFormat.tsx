"use client";

import { useWatch } from "react-hook-form";
import { UsersIcon, GoalIcon, ChevronRightIcon, ChevronLeftIcon } from "lucide-react";

import { PLAYER_OPTIONS } from "@/lib/match-schema";
import { useMatchFormContext } from "@/contexts/MatchFormContext";
import { useMatchFormNavigation } from "@/hooks/useMatchFormNavigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ChipGroup } from "@/components/form/ChipGroup";

interface StepFormatProps {
  stepNumber: number;
}

export default function StepFormat({ stepNumber }: StepFormatProps) {
  const { control, formId, setValue } = useMatchFormContext();
  const { handleNext, handleBack, isNavigating, getStepStatus, isStepActive } = useMatchFormNavigation();
  const { isActive, isPast } = getStepStatus(stepNumber);

  const playersPerTeam = useWatch({ control, name: "playersPerTeam" });
  const hasRentedGoalkeepers = useWatch({ control, name: "hasRentedGoalkeepers" });
  const rentedGoalkeepersCount = useWatch({ control, name: "rentedGoalkeepersCount" });

  const isValid = isStepActive(stepNumber) && playersPerTeam >= 6;

  const playerOptions = PLAYER_OPTIONS.map((num) => ({
    value: num,
    label: `${num} vs ${num}`,
  }));

  const goalkeeperOptions = [
    { value: 1, label: "1 arquero" },
    { value: 2, label: "2 arqueros" },
  ];

  return (
    <Card
      className={isActive || isPast ? "opacity-100 grayscale-0" : "opacity-40 grayscale pointer-events-none"}
      aria-hidden={!isActive && !isPast}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UsersIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Formato del Partido</h2>
            <p className="text-sm text-muted-foreground">Configura jugadores y arqueros</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset className="space-y-3 border-0 p-0 m-0">
          <legend className="text-sm font-medium text-card-foreground mb-1">Jugadores por Equipo</legend>
          <ChipGroup
            options={playerOptions}
            value={playersPerTeam}
            onChange={(val) => setValue("playersPerTeam", val, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            })}
            label="Seleccionar jugadores por equipo"
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Total: {playersPerTeam * 2} jugadores
          </p>
        </fieldset>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${formId}-hasRentedGoalkeepers`}
              checked={hasRentedGoalkeepers}
              onCheckedChange={(checked) => {
                setValue("hasRentedGoalkeepers", !!checked, { shouldValidate: true });
              }}
            />
            <Label htmlFor={`${formId}-hasRentedGoalkeepers`} className="cursor-pointer flex items-center gap-2">
              <GoalIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Incluir arqueros alquilados
            </Label>
          </div>

          {hasRentedGoalkeepers && (
            <div className="ml-7 space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor={`${formId}-rentedGoalkeepersCount`}>Cantidad de arqueros</Label>
                <ChipGroup
                  options={goalkeeperOptions}
                  value={rentedGoalkeepersCount}
                  onChange={(val) => setValue("rentedGoalkeepersCount", val, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })}
                  label="Cantidad de arqueros alquilados"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            Atrás
          </Button>
          <Button type="button" onClick={handleNext} disabled={!isValid || isNavigating}>
            Continuar
            <ChevronRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}