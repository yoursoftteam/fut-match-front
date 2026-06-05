import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselControlsProps {
  total: number;
  current: number;
  onGoTo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CarouselControls({
  total,
  current,
  onGoTo,
  onPrev,
  onNext,
}: CarouselControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <button
        onClick={onPrev}
        className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2" role="tablist" aria-label="Navegación de slides">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            role="tab"
            aria-selected={i === current}
            aria-label={`Ir al slide ${i + 1}`}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer",
              i === current
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
        aria-label="Slide siguiente"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
