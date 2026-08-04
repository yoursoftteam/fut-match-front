import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors, radius } from '@/theme/tokens'

interface FormGroupProps {
  children: React.ReactNode
}

export function FormGroup({ children }: FormGroupProps) {
  const rows = React.Children.toArray(children)

  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <View key={index} style={[styles.row, index > 0 && styles.rowSeparator]}>
          {row}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 12,
  },
  rowSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
})
