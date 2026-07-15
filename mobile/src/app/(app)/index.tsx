import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.user_metadata?.name ?? 'Jugador'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mis Partidos</Text>
        <Text style={styles.cardPlaceholder}>Pronto podras ver tus partidos aqui</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Cerrar Sesion</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E14', padding: 24 },
  header: { marginTop: 60, marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  email: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  card: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2D3348',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  cardPlaceholder: { fontSize: 14, color: '#6B7280' },
  signOutButton: {
    marginTop: 'auto',
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '500' },
})
