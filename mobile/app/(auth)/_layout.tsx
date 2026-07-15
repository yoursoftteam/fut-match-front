import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Redirect href="/(app)" />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  )
}
