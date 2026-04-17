'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize signup mode based on URL params
  const [isSignUp, setIsSignUp] = useState(() => {
    // This will run on client-side only due to Suspense boundary
    const mode = searchParams.get('mode')
    return mode === 'signup'
  })

  useEffect(() => {
    const mode = searchParams.get('mode')
    setIsSignUp(mode === 'signup')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    if (!email || !password) {
      setMessage('Completa todos los campos para continuar.')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        console.log('Intentando registrar usuario:', email)
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined
        console.log('Redirect URL:', redirectTo)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            // For development, you might need to configure Supabase to not require email confirmation
            // Go to Supabase Dashboard > Authentication > Settings and disable "Enable email confirmations"
          },
        })

        console.log('Respuesta completa de Supabase:', { data, error })

        if (error) {
          console.error('Error detallado en registro:', error)
          // Log additional error details
          console.error('Error message:', error.message)
          console.error('Error status:', error.status)
          throw error
        }

        console.log('Usuario registrado exitosamente:', data.user)
        console.log('¿Usuario confirmado?', data.user?.email_confirmed_at)
        setMessage(
          'Registro enviado. Revisa tu email para confirmar tu cuenta y luego inicia sesión.'
        )
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        router.push('/dashboard')
      }
    } catch (error: any) {
      setMessage(error?.message ?? 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? 'Únete a la comunidad de futbolistas'
                : 'Bienvenido de vuelta a FutMatch'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary-fm py-3 font-semibold text-lg"
            >
              {loading ? 'Cargando...' : isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          {message ? (
            <div className="mt-4 rounded-lg border border-border bg-background p-4 text-center text-sm text-foreground">
              {message}
            </div>
          ) : null}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                const newMode = !isSignUp
                setIsSignUp(newMode)
                setMessage('')
                // Update URL without causing a page reload
                const newUrl = newMode ? '/auth?mode=signup' : '/auth?mode=signin'
                window.history.replaceState({}, '', newUrl)
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'
              }
            </button>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}