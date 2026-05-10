import { useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

export function useCurrencyFormatter() {
  const parseCurrencyValue = useCallback((rawValue: string): number => {
    const numericValue = rawValue.replace(/\D/g, "");
    return numericValue === "" ? 0 : Number(numericValue);
  }, []);

  const formatCurrencyValue = useCallback((value: number): string => {
    return value > 0 ? formatCurrency(value) : "";
  }, []);

  return { parseCurrencyValue, formatCurrencyValue };
}
