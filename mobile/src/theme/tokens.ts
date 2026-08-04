export const colors = {
  background: '#03060d',
  foreground: '#ebeff5',
  card: '#070b14',
  cardForeground: '#ebeff5',
  primary: '#00af67',
  primaryHover: '#10b981',
  primaryForeground: '#03060d',
  secondary: '#151b24',
  secondaryForeground: '#dadee5',
  muted: '#1c222b',
  mutedForeground: '#88909c',
  accent: '#009ed8',
  accentForeground: '#03060d',
  destructive: '#cc272e',
  destructiveForeground: '#fafafa',
  border: '#282e38',
  input: '#232933',
  ring: '#00af67',
  success: '#22c55e',
  white: '#ffffff',
  googleText: '#111827',
  placeholder: '#88909c',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 6,
  },
  neon: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
} as const

export const fonts = {
  heading: 'Outfit_700Bold',
  body: 'SpaceGrotesk_400Regular',
  bodyMedium: 'SpaceGrotesk_500Medium',
  bodySemiBold: 'SpaceGrotesk_600SemiBold',
} as const
