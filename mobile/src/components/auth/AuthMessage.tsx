import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, fonts } from '@/theme/tokens'

interface AuthMessageProps {
  type: 'success' | 'error'
  children: React.ReactNode
}

export function AuthMessage({ type, children }: AuthMessageProps) {
  const isSuccess = type === 'success'
  return (
    <View style={[styles.base, isSuccess ? styles.success : styles.error]}>
      <Text style={[styles.text, isSuccess ? styles.textSuccess : styles.textError]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  success: {
    borderColor: 'rgba(0, 175, 103, 0.3)',
    backgroundColor: 'rgba(0, 175, 103, 0.1)',
  },
  error: {
    borderColor: 'rgba(204, 39, 46, 0.3)',
    backgroundColor: 'rgba(204, 39, 46, 0.1)',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  textSuccess: {
    color: colors.primary,
  },
  textError: {
    color: colors.destructive,
  },
})
