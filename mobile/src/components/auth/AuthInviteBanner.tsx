import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { radius, fonts } from '@/theme/tokens'

export function AuthInviteBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Estás a un paso de entrar a una polla.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#22C55E',
    textAlign: 'center',
  },
})
