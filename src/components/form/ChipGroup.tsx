import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string | number> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: ChipGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={String(value) === String(option.value)}
          onClick={() => onChange(option.value)}
          ariaLabel={option.label}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
}

function Chip({ selected, onClick, ariaLabel, children }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      {children}
    </button>
  );
}
