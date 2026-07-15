import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Mis Partidos' }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
