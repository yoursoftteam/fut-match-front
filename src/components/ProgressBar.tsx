import { cn } from "@/lib/utils";
import { useMatchFormContext } from "@/contexts/MatchFormContext";

export function ProgressBar() {
  const { currentStep, totalSteps, labels, goToStep } = useMatchFormContext();

  return (
    <nav aria-label="Progreso del formulario" className="w-full py-6">
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Paso ${currentStep} de ${totalSteps}: ${labels[currentStep - 1]}`}
        className="flex items-center justify-between"
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  disabled={step > currentStep}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Paso ${step}: ${labels[i]}${isCompleted ? " (completado)" : ""}`}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isCompleted && "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground border border-border dark:bg-muted/60",
                    step > currentStep && "cursor-not-allowed opacity-50",
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span aria-hidden="true">{step}</span>
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    isCompleted && "text-foreground",
                    isCurrent && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {labels[i]}
                </span>
              </div>
              {step < totalSteps && (
                <div
                  className={cn(
                    "mx-2 h-1 flex-1 rounded-full transition-colors duration-200",
                    isCompleted ? "bg-primary" : "bg-border dark:bg-muted-foreground/40",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
