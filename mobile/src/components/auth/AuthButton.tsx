import React from 'react'
import { Text, ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, fonts, shadows } from '@/theme/tokens'

type AuthButtonVariant = 'primary' | 'outline' | 'google'

interface AuthButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: AuthButtonVariant
  loading?: boolean
  label: string
  icon?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function AuthButton({ variant = 'primary', loading, label, icon, disabled, style, ...props }: AuthButtonProps) {
  const isPrimary = variant === 'primary'
  const isGoogle = variant === 'google'

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? [styles.primary, shadows.neon]
          : styles.outlineBase,
        isGoogle ? styles.google : null,
        disabled || loading ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {!loading && icon ? icon : null}
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? colors.primaryForeground : colors.foreground} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelOutline, isGoogle ? styles.labelGoogle : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outlineBase: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  google: {
    backgroundColor: colors.white,
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  labelPrimary: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  labelOutline: {
    color: colors.foreground,
  },
  labelGoogle: {
    color: colors.googleText,
  },
})
