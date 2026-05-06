"use client";

import { useWatch } from "react-hook-form";
import { DollarSignIcon, ChevronLeftIcon, Loader2Icon } from "lucide-react";

import { formatCurrency } from "@/lib/currency";
import { useMatchFormContext } from "@/contexts/MatchFormContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { FieldGroup } from "@/components/form/FieldGroup";

interface StepCostsProps {
  onBack: () => void;
  isValid: boolean;
  disabled: boolean;
  submitLabel: string;
  submitButtonType: "button" | "submit";
  onSubmitButtonClick?: () => void;
  onClick: () => void;
  fieldCost: number;
}

export default function StepCosts({
  onBack,
  isValid,
  disabled,
  submitLabel,
  submitButtonType,
  onSubmitButtonClick,
  onClick,
  fieldCost,
}: StepCostsProps) {
  const { currentStep, formId, control, setValue, trigger, formState: { errors } } = useMatchFormContext();
  const isActive = currentStep === 3;

  const rentalCost = useWatch({ control, name: "rentalCost" });
  const hasRentedGoalkeepers = useWatch({ control, name: "hasRentedGoalkeepers" });
  const rentedGoalkeepersCount = useWatch({ control, name: "rentedGoalkeepersCount" });
  const playersPerTeam = useWatch({ control, name: "playersPerTeam" });

  const totalPlayers = playersPerTeam * 2;
  const totalCost = hasRentedGoalkeepers ? fieldCost + rentalCost : fieldCost;
  const costPerPlayer = totalCost > 0 ? Math.round(totalCost / totalPlayers) : 0;

  const isPastStep = currentStep > 3;

  return (
    <Card
      className={isActive || isPastStep ? "opacity-100 grayscale-0" : "opacity-40 grayscale pointer-events-none"}
      aria-hidden={!isActive && !isPastStep}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <DollarSignIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Costos</h2>
            <p className="text-sm text-muted-foreground">Define el valor de la cancha y arqueros</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup
            id="fieldCost"
            label="Valor de la Cancha"
            error={errors.fieldCost?.message}
          >
            <CurrencyInput
              id={`${formId}-fieldCost`}
              value={fieldCost}
              onChange={(val) => setValue("fieldCost", val, { shouldValidate: true })}
              onBlur={() => trigger("fieldCost")}
              placeholder="200.000"
            />
          </FieldGroup>

          {hasRentedGoalkeepers && (
            <FieldGroup
              id="rentalCost"
              label={`Valor Arqueros (${rentedGoalkeepersCount})`}
            >
              <CurrencyInput
                id={`${formId}-rentalCost`}
                value={rentalCost}
                onChange={(val) => setValue("rentalCost", val, { shouldValidate: true })}
                placeholder="50.000"
              />
            </FieldGroup>
          )}
        </div>

        {fieldCost > 0 && (
          <div className="bg-muted rounded-lg border border-border p-4 space-y-3 dark:bg-muted/80" role="region" aria-label="Resumen del costo">
            <h3 className="font-semibold text-card-foreground text-sm">Resumen del Costo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formato:</span>
                <span className="font-medium tabular-nums">{playersPerTeam} vs {playersPerTeam}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total jugadores:</span>
                <span className="font-medium tabular-nums">{totalPlayers}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor cancha:</span>
                <span className="font-medium tabular-nums">{formatCurrency(fieldCost)}</span>
              </div>
              {hasRentedGoalkeepers && rentalCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arqueros ({rentedGoalkeepersCount}):</span>
                  <span className="font-medium tabular-nums">{formatCurrency(rentalCost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between pt-1">
                <span className="text-foreground font-semibold">Aporte por jugador:</span>
                <span className="font-bold text-primary text-lg tabular-nums">{formatCurrency(costPerPlayer)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            Atrás
          </Button>
          <Button
            type={submitButtonType}
            disabled={disabled || !isValid}
            onClick={onSubmitButtonClick ? undefined : onClick}
          >
            {disabled ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Creando…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
