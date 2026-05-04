const currencyFormatter = new Intl.NumberFormat("es-CO");

export function formatCurrency(value: number): string {
  return `$ ${currencyFormatter.format(value)}`;
}