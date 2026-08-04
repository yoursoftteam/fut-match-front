export interface AuthErrorMessageOptions {
  resetMode?: boolean
}

const LOWER_CASE_TARGETS = [
  ['invalid login', 'invalid credentials', 'email not confirmed', 'user not found'],
  ['already registered', 'user already exists'],
  ['at least 6', 'minimum 6', 'too short'],
  ['rate limit'],
] as const

const MESSAGES: Record<number, string> = {
  0: 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
  1: 'Ya existe una cuenta con este email. Intenta iniciar sesión.',
  2: 'La contraseña debe tener al menos 6 caracteres.',
  3: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
}

export function getAuthErrorMessage(error: unknown, options?: AuthErrorMessageOptions): string {
  const err = (error ?? {}) as { message?: string; status?: number }
  const raw = err?.message ?? ''
  const lower = raw.toLowerCase()

  for (let i = 0; i < LOWER_CASE_TARGETS.length; i++) {
    if (LOWER_CASE_TARGETS[i].some((target) => lower.includes(target))) {
      return MESSAGES[i]
    }
  }

  if (err?.status === 429) {
    return MESSAGES[3]
  }

  if (options?.resetMode) {
    return 'No se pudo actualizar la contraseña. Abre de nuevo el enlace del correo e inténtalo otra vez.'
  }

  return 'Ocurrió un error. Intenta de nuevo.'
}
