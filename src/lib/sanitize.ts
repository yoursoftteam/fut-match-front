const SQL_PATTERNS = /(?:DROP|ALTER|CREATE|INSERT|DELETE|UPDATE|TRUNCATE|EXEC|EXECUTE|UNION|SELECT)\s|--|;|\/\*|\*\//i

const DANGEROUS_CHARS = /[<>]/g

export function sanitizeText(input: string, maxLength = 1000): string {
  let trimmed = input.trim()

  if (trimmed.length > maxLength) {
    trimmed = trimmed.slice(0, maxLength)
  }

  trimmed = trimmed.replace(SQL_PATTERNS, "")
  trimmed = trimmed.replace(DANGEROUS_CHARS, "")

  return trimmed.trim()
}

export function validateText(
  input: string,
  options: { min?: number; max?: number; required?: boolean; label?: string } = {},
): string | null {
  const { min = 1, max = 1000, required = true, label = "Texto" } = options
  const trimmed = input.trim()

  if (required && !trimmed) {
    return `${label} es obligatorio.`
  }

  if (trimmed.length < min) {
    return `${label} debe tener al menos ${min} caracteres.`
  }

  if (trimmed.length > max) {
    return `${label} debe tener máximo ${max} caracteres.`
  }

  if (SQL_PATTERNS.test(trimmed)) {
    return `${label} contiene caracteres no permitidos.`
  }

  if (DANGEROUS_CHARS.test(trimmed)) {
    return `${label} contiene caracteres no válidos.`
  }

  return null
}
