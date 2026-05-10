import { forwardRef, type InputHTMLAttributes } from "react";
import { formatCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  prefix?: string;
  placeholder?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, label, prefix = "$", placeholder, className, ...props }, ref) => {
    const displayValue = value > 0 ? formatCurrency(value) : "";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = e.target.value.replace(/\D/g, "");
      onChange(numericValue === "" ? 0 : Number(numericValue));
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" aria-hidden="true">
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn("pl-7", className)}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          aria-label={label}
          {...props}
        />
      </div>
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
