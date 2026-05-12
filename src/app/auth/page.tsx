"use client";


import { useState, useEffect, Suspense } from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSignUp, setIsSignUp] = useState(() => {
    const mode = searchParams.get("mode");
    return mode === "signup";
  });

  useEffect(() => {
    const mode = searchParams.get("mode");
    setIsSignUp(mode === "signup");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!hasSupabaseEnv) {
      setMessage("Faltan variables de entorno de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setMessage("Completa todos los campos para continuar.");
      setLoading(false);
      return;
    }

    if (isSignUp && password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const redirectTo =
          typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          throw error;
        }

        setMessage(
          "Registro enviado. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.refresh();
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      // Map Supabase errors to generic messages to avoid account enumeration
      const raw = err?.message ?? "";
      if (
        raw.toLowerCase().includes("invalid login") ||
        raw.toLowerCase().includes("invalid credentials") ||
        raw.toLowerCase().includes("email not confirmed") ||
        raw.toLowerCase().includes("user not found")
      ) {
        setMessage("Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.");
      } else if (raw.toLowerCase().includes("already registered") || raw.toLowerCase().includes("user already exists")) {
        setMessage("Ya existe una cuenta con este email. Intenta iniciar sesión.");
      } else if (raw.toLowerCase().includes("password")) {
        setMessage("La contraseña debe tener al menos 6 caracteres.");
      } else if (raw.toLowerCase().includes("rate limit") || err?.status === 429) {
        setMessage("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else {
        setMessage("Ocurrió un error. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? "Únete a la comunidad de deportistas"
                : "Bienvenido de vuelta a Parti2"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-card-foreground mb-2">
                Email
              </label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com…"
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-card-foreground mb-2">
                Contraseña
              </label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full py-3 text-lg">
              {loading ? "Cargando…" : isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
            </Button>
          </form>

          {message ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-border bg-background p-4 text-center text-sm text-foreground"
            >
              {message}
            </div>
          ) : null}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                const newMode = !isSignUp;
                setIsSignUp(newMode);
                setMessage("");
                const newUrl = newMode ? "/auth?mode=signup" : "/auth?mode=signin";
                window.history.replaceState({}, "", newUrl);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate"}
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
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <div className="text-muted-foreground">Cargando…</div>
          </div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
