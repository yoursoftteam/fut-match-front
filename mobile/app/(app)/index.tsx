import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardScreen() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {user?.user_metadata?.full_name ?? user?.email} 👋</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mis Partidos</Text>
        <Text style={styles.cardEmpty}>Aún no tienes partidos</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  signOutButton: {
    marginTop: 'auto',
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
})
