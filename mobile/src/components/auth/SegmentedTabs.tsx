import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, radius, fonts } from '@/theme/tokens'

export type AuthTab = 'login' | 'signup'

interface SegmentedTabsProps {
  active: AuthTab
  onChange: (tab: AuthTab) => void
}

const TABS: ReadonlyArray<{ key: AuthTab; label: string }> = [
  { key: 'login', label: 'Iniciar Sesión' },
  { key: 'signup', label: 'Crear Cuenta' },
]

export function SegmentedTabs({ active, onChange }: SegmentedTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = active === tab.key
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [styles.tab, isActive ? styles.tabActive : null, pressed && !isActive ? styles.tabPressed : null]}
          >
            <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: 'rgba(28, 34, 43, 0.4)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  tabActive: {
    backgroundColor: colors.primary,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  tabPressed: {
    opacity: 0.6,
  },
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
})
