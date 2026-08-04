import React from 'react'
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView } from 'react-native'
import { useFonts } from 'expo-font'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Zap } from 'lucide-react-native'
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk'
import { Outfit_700Bold } from '@expo-google-fonts/outfit'
import { colors, spacing, radius, fonts } from '@/theme/tokens'

interface AuthScreenProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

function Glow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.glow} />
      <View style={styles.glowWrap}>
        <View style={[styles.glowCircle, styles.glowOuter]} />
        <View style={[styles.glowCircle, styles.glowMid]} />
        <View style={[styles.glowCircle, styles.glowInner]} />
      </View>
    </View>
  )
}

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    Outfit_700Bold,
  })

  if (!fontsLoaded) {
    return <View style={styles.container} />
  }

  const topPadding = process.env.EXPO_OS === 'android' ? insets.top + spacing['2xl'] : spacing['2xl']

  return (
    <View style={styles.container}>
      <Glow />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPadding }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View entering={FadeInUp.duration(350)} style={styles.header}>
            <View style={styles.brand}>
              <Zap size={26} color={colors.primaryForeground} fill={colors.primaryForeground} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(80)} style={styles.content}>
            {children}
          </Animated.View>

          {footer ? (
            <Animated.View entering={FadeInUp.duration(400).delay(160)} style={styles.footer}>
              {footer}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  glow: {
    ...StyleSheet.absoluteFillObject,
    experimental_backgroundImage:
      'radial-gradient(ellipse at top, rgba(0, 175, 103, 0.16) 0%, rgba(0, 175, 103, 0) 65%)',
  },
  glowWrap: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glowCircle: { position: 'absolute', backgroundColor: colors.primary },
  glowOuter: { width: 360, height: 360, borderRadius: 180, opacity: 0.045 },
  glowMid: { width: 230, height: 230, borderRadius: 115, opacity: 0.07 },
  glowInner: { width: 130, height: 130, borderRadius: 65, opacity: 0.1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  brand: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    boxShadow: '0 0 24px rgba(0, 175, 103, 0.35)',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    gap: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
})
