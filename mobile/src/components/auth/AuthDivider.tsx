import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts } from '@/theme/tokens'

export function AuthDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>o continúa con email</Text>
      <View style={styles.line} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
})
