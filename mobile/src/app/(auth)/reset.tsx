import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Lock, Zap, ArrowLeft } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@shared/lib/auth-errors'
import { AuthScreen, AuthField, FormGroup, AuthButton, AuthMessage } from '@/components/auth'
import { colors, fonts } from '@/theme/tokens'

export default function ResetScreen() {
  const router = useRouter()
  const { session, resetPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Completa todos los campos.' })
      return
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'La confirmación de contraseña no coincide.' })
      return
    }

    setMessage(null)
    setLoading(true)
    const { error } = await resetPassword(password)
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: getAuthErrorMessage(error, { resetMode: true }) })
    } else {
      setMessage({
        type: 'success',
        text: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      })
      setTimeout(() => router.replace('/(auth)/login'), 1200)
    }
  }

  const backLink = (
    <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8} accessibilityRole="button">
      {({ pressed }) => (
        <View style={styles.backLink}>
          <ArrowLeft size={16} color={pressed ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.backLinkText, pressed && styles.backLinkPressed]}>
            Volver a iniciar sesión
          </Text>
        </View>
      )}
    </Pressable>
  )

  if (!session) {
    return (
      <AuthScreen
        title="Enlace inválido"
        subtitle="Abre de nuevo el enlace del correo para restablecer tu contraseña."
        footer={backLink}
      >
        <View style={styles.form}>
          <AuthMessage type="error">
            No se pudo validar el enlace. Abre de nuevo el correo e inténtalo otra vez.
          </AuthMessage>
        </View>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Nueva contraseña"
      subtitle="Define una contraseña nueva para tu cuenta"
      footer={backLink}
    >
      <View style={styles.form}>
        <FormGroup>
          <AuthField
            label="Nueva contraseña"
            value={password}
            onChangeText={setPassword}
            isPassword
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />
          <AuthField
            label="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />
        </FormGroup>

        <AuthButton
          variant="primary"
          label="Actualizar contraseña"
          loading={loading}
          onPress={handleSubmit}
          icon={<Zap size={18} color={colors.primaryForeground} />}
        />

        {message ? <AuthMessage type={message.type}>{message.text}</AuthMessage> : null}
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLinkText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  backLinkPressed: {
    color: colors.primary,
  },
})
