import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Mail, Zap, ArrowLeft } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@shared/lib/auth-errors'
import { AuthScreen, AuthField, FormGroup, AuthButton, AuthMessage } from '@/components/auth'
import { colors, fonts } from '@/theme/tokens'

export default function ForgotScreen() {
  const router = useRouter()
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Ingresa tu email para continuar.' })
      return
    }
    setMessage(null)
    setLoading(true)
    const { error } = await forgotPassword(email)
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: getAuthErrorMessage(error) })
    } else {
      setMessage({
        type: 'success',
        text: 'Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja.',
      })
    }
  }

  return (
    <AuthScreen
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para recuperar tu acceso"
      footer={
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
      }
    >
      <View style={styles.form}>
        <FormGroup>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            autoCorrect={false}
            spellCheck={false}
            placeholder="tu@email.com"
            icon={<Mail size={18} color={colors.mutedForeground} />}
          />
        </FormGroup>

        <AuthButton
          variant="primary"
          label="Enviar correo"
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
