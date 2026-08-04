import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Mail, Lock, Zap } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@shared/lib/auth-errors'
import { getPendingInvite } from '@/lib/storage'
import {
  AuthScreen,
  AuthField,
  FormGroup,
  AuthButton,
  AuthMessage,
  AuthDivider,
  AuthInviteBanner,
  SegmentedTabs,
  GoogleIcon,
  type AuthTab,
} from '@/components/auth'
import { colors, fonts } from '@/theme/tokens'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)

  useEffect(() => {
    getPendingInvite().then(setPendingInvite)
  }, [])

  const switchTab = (tab: AuthTab) => {
    router.replace(tab === 'signup' ? '/(auth)/signup' : '/(auth)/login')
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Completa todos los campos para continuar.' })
      return
    }
    setMessage(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setMessage({ type: 'error', text: getAuthErrorMessage(error) })
  }

  const handleGoogle = async () => {
    setMessage(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    setGoogleLoading(false)
    if (error) setMessage({ type: 'error', text: getAuthErrorMessage(error) })
  }

  return (
    <AuthScreen title="Iniciar Sesión" subtitle="Bienvenido de vuelta a Parti2">
      <View style={styles.form}>
        {pendingInvite ? <AuthInviteBanner /> : null}

        <SegmentedTabs active="login" onChange={switchTab} />

        <AuthButton
          variant="outline"
          label="Continuar con Google"
          loading={googleLoading}
          disabled={loading}
          onPress={handleGoogle}
          icon={<GoogleIcon size={20} />}
        />

        <AuthDivider />

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
          <AuthField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            isPassword
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />
        </FormGroup>

        <View style={styles.forgotRow}>
          <Pressable onPress={() => router.push('/(auth)/forgot')} hitSlop={8} accessibilityRole="button">
            {({ pressed }) => (
              <Text style={[styles.forgotLink, pressed && styles.linkPressed]}>¿Olvidaste tu contraseña?</Text>
            )}
          </Pressable>
        </View>

        <AuthButton
          variant="primary"
          label="Iniciar Sesión"
          loading={loading}
          disabled={googleLoading}
          onPress={handleLogin}
          icon={<Zap size={18} color={colors.primaryForeground} />}
        />

        <View style={styles.terms}>
          <Text style={styles.termsText}>
            Al continuar, aceptas nuestros <Text style={styles.termsBold}>Términos y Condiciones</Text> y la{' '}
            <Text style={styles.termsBold}>Política de Privacidad</Text>.
          </Text>
        </View>

        {message ? <AuthMessage type={message.type}>{message.text}</AuthMessage> : null}
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotLink: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  linkPressed: {
    color: colors.primary,
  },
  terms: {
    borderWidth: 1,
    borderColor: 'rgba(0, 175, 103, 0.2)',
    backgroundColor: 'rgba(0, 175, 103, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  termsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.mutedForeground,
  },
  termsBold: {
    fontFamily: fonts.bodySemiBold,
    fontWeight: '600',
    color: colors.foreground,
  },
})
