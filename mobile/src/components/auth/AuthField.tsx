import React, { useState } from 'react'
import { View, Text, TextInput, TextInputProps, StyleSheet, Pressable } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import { colors, fonts } from '@/theme/tokens'

interface AuthFieldProps extends TextInputProps {
  label: string
  isPassword?: boolean
  icon?: React.ReactNode
}

export function AuthField({ label, isPassword, icon, ...props }: AuthFieldProps) {
  const [secure, setSecure] = useState(isPassword)
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      <View style={styles.row}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          {...props}
          secureTextEntry={isPassword ? secure : false}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setSecure((s) => !s)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
            accessibilityRole="button"
            accessibilityLabel={secure ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            {secure ? (
              <Eye size={18} color={colors.mutedForeground} />
            ) : (
              <EyeOff size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  labelFocused: {
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: { opacity: 0.8 },
  input: {
    flex: 1,
    height: 42,
    fontSize: 16,
    color: colors.foreground,
    fontFamily: fonts.body,
    paddingVertical: 0,
  },
  toggle: {
    paddingVertical: 8,
    paddingLeft: 8,
  },
  togglePressed: {
    opacity: 0.6,
  },
})
