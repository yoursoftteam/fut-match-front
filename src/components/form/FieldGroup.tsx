import { type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldGroupProps {
  id: string;
  label: string;
  htmlFor?: string;
  error?: string;
  errorId?: string;
  helpText?: string;
  helpId?: string;
  children: ReactNode;
  className?: string;
}

export function FieldGroup({
  id,
  label,
  htmlFor,
  error,
  errorId,
  helpText,
  helpId,
  children,
  className,
}: FieldGroupProps) {
  const fieldHtmlFor = htmlFor || id;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldHtmlFor}>{label}</Label>
      {children}
      {helpText && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
