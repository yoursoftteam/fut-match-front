import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Mail, Lock, User, Zap } from 'lucide-react-native'
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

export default function SignupScreen() {
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()
  const [fullName, setFullName] = useState('')
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  const handleSignup = async () => {
    if (!fullName || !alias || !email || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Completa todos los campos para continuar.' })
      return
    }
    if (fullName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Ingresa tu nombre completo para continuar.' })
      return
    }
    if (alias.trim().length < 2) {
      setMessage({ type: 'error', text: 'Ingresa el alias con el que te identificas.' })
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
    const { error } = await signUp(email, password, fullName.trim(), alias.trim())
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: getAuthErrorMessage(error) })
    } else {
      setMessage({
        type: 'success',
        text: 'Registro enviado. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.',
      })
    }
  }

  const handleGoogle = async () => {
    setMessage(null)
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    setGoogleLoading(false)
    if (error) setMessage({ type: 'error', text: getAuthErrorMessage(error) })
  }

  return (
    <AuthScreen title="Crear Cuenta" subtitle="Únete a la comunidad deportiva">
      <View style={styles.form}>
        {pendingInvite ? <AuthInviteBanner /> : null}

        <SegmentedTabs active="signup" onChange={switchTab} />

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
            label="Nombre completo"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Tu nombre completo"
            icon={<User size={18} color={colors.mutedForeground} />}
          />
          <AuthField
            label="¿Cómo quieres que te llamen?"
            value={alias}
            onChangeText={setAlias}
            autoCapitalize="words"
            autoComplete="nickname"
            placeholder="Tu alias"
            icon={<User size={18} color={colors.mutedForeground} />}
          />
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
          label="Crear Cuenta"
          loading={loading}
          disabled={googleLoading}
          onPress={handleSignup}
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
