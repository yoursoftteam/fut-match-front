"use client";

import { useState, useEffect, Suspense } from "react";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Zap, Mail, Lock, Eye, EyeOff } from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

function getModeFromSearchParams(mode: string | null): AuthMode {
  if (mode === "signup") return "signup";
  if (mode === "forgot") return "forgot";
  if (mode === "reset") return "reset";
  return "signin";
}

function getBaseSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw && raw.trim().length > 0) {
    const normalized = raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;
    try {
      return new URL(normalized).origin;
    } catch {
      // Fall back to browser origin below.
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function buildRedirectUrl(pathWithQuery: string): string | undefined {
  const base = getBaseSiteUrl();
  if (!base) return undefined;
  return new URL(pathWithQuery, base).toString();
}

function AuthForm() {
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(() =>
    getModeFromSearchParams(searchParams.get("mode"))
  );

  const isSignUp = mode === "signup";
  const isForgotMode = mode === "forgot";
  const isResetMode = mode === "reset";

  useEffect(() => {
    setMode(getModeFromSearchParams(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage("");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    const newUrl =
      nextMode === "signin" ? "/auth?mode=signin" : `/auth?mode=${nextMode}`;
    router.replace(newUrl);
  };

  const handleGoogleAuth = async () => {
    setMessage("");
    setLoading(true);

    if (!hasSupabaseEnv) {
      setMessage(
        "Faltan variables de entorno de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      const redirectTo = buildRedirectUrl("/dashboard");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch {
      setMessageType("error");
      setMessage("No se pudo iniciar con Google. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!hasSupabaseEnv) {
      setMessage(
        "Faltan variables de entorno de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (!email && !isResetMode) {
      setMessage("Completa todos los campos para continuar.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (isSignUp && fullName.trim().length < 2) {
      setMessage("Ingresa tu nombre completo para continuar.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (
      (mode === "signin" || mode === "signup" || mode === "reset") &&
      !password
    ) {
      setMessage("Completa todos los campos para continuar.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if ((isSignUp || isResetMode) && password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if ((isSignUp || isResetMode) && password !== confirmPassword) {
      setMessage("La confirmación de contraseña no coincide.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const redirectTo = buildRedirectUrl("/dashboard");
        const normalizedFullName = fullName.trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: normalizedFullName,
              name: normalizedFullName,
            },
          },
        });
        if (error) throw error;
        setMessageType("success");
        setMessage(
          "Registro enviado. Revisa tu correo para confirmar tu cuenta y luego inicia sesión."
        );
      } else if (isForgotMode) {
        const redirectTo = buildRedirectUrl("/auth?mode=reset");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
        setMessageType("success");
        setMessage(
          "Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja."
        );
      } else if (isResetMode) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessageType("success");
        setMessage(
          "Contraseña actualizada correctamente. Ya puedes iniciar sesión."
        );
        setTimeout(() => {
          switchMode("signin");
        }, 1200);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.refresh();
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      const raw = err?.message ?? "";
      const lower = raw.toLowerCase();
      setMessageType("error");
      if (
        lower.includes("invalid login") ||
        lower.includes("invalid credentials") ||
        lower.includes("email not confirmed") ||
        lower.includes("user not found")
      ) {
        setMessage(
          "Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo."
        );
      } else if (
        lower.includes("already registered") ||
        lower.includes("user already exists")
      ) {
        setMessage("Ya existe una cuenta con este email. Intenta iniciar sesión.");
      } else if (
        lower.includes("at least 6") ||
        lower.includes("minimum 6") ||
        lower.includes("too short")
      ) {
        setMessage("La contraseña debe tener al menos 6 caracteres.");
      } else if (lower.includes("rate limit") || err?.status === 429) {
        setMessage("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else if (isResetMode) {
        setMessage(
          "No se pudo actualizar la contraseña. Abre de nuevo el enlace del correo e inténtalo otra vez."
        );
      } else {
        setMessage("Ocurrió un error. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const titleMap: Record<AuthMode, string> = {
    signin: "Iniciar Sesión",
    signup: "Crear Cuenta",
    forgot: "Recuperar contraseña",
    reset: "Nueva contraseña",
  };

  const subtitleMap: Record<AuthMode, string> = {
    signin: "Bienvenido de vuelta a Parti2",
    signup: "Únete a la comunidad deportiva",
    forgot: "Te enviaremos un enlace para recuperar tu acceso",
    reset: "Define una contraseña nueva para tu cuenta",
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-r-transparent mx-auto mb-4" />
          <div className="text-muted-foreground text-sm">Cargando…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow — same as home */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in oklch, var(--primary) 10%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="card p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
              {titleMap[mode]}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {subtitleMap[mode]}
            </p>
          </div>

          {/* Signin / Signup tab switcher */}
          {!isForgotMode && !isResetMode && (
            <div className="flex rounded-xl border border-border bg-muted/40 p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                  !isSignUp
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                  isSignUp
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {!isForgotMode && !isResetMode && (
            <div className="space-y-4 mb-5">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleAuth}
                className="w-full py-3 text-base font-semibold gap-2"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  focusable="false"
                >
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.8-.07-1.56-.2-2.3H12v4.35h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.28-2.1 3.56-5.2 3.56-8.67Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3A7.2 7.2 0 0 1 12 19.3a7.15 7.15 0 0 1-6.72-4.95h-4v3.1A12 12 0 0 0 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.35A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.39-2.35v-3.1h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.45l4-3.1Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.77c1.76 0 3.33.6 4.57 1.77l3.42-3.42A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.29 6.55l4 3.1A7.15 7.15 0 0 1 12 4.77Z"
                  />
                </svg>
                Continuar con Google
              </Button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>o continúa con email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">Nombre completo</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    className="h-12"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            {!isResetMode && (
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={{ paddingLeft: "2.75rem" }}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {!isForgotMode && (
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  {isResetMode ? "Nueva contraseña" : "Contraseña"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isSignUp || isResetMode ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {(isSignUp || isResetMode) && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={
                      showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {!isSignUp && !isForgotMode && !isResetMode && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-base font-bold btn-primary-fm neon-glow gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                  Cargando…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {isSignUp
                    ? "Crear Cuenta"
                    : isForgotMode
                      ? "Enviar correo"
                      : isResetMode
                        ? "Actualizar contraseña"
                        : "Iniciar Sesión"}
                </>
              )}
            </Button>

            <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
              Al continuar, aceptas nuestros{" "}
              <Link
                href="/terms"
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
              >
                Terminos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacy"
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
              >
                Politica de Privacidad
              </Link>
              .
            </p>
          </form>

          {/* Feedback message */}
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-xl border px-4 py-3 text-center text-sm ${
                messageType === "success"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {message}
            </div>
          )}

          {/* Back link for forgot/reset */}
          {(isForgotMode || isResetMode) && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a iniciar sesión
              </button>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
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
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-r-transparent mx-auto mb-4" />
            <div className="text-muted-foreground text-sm">Cargando…</div>
          </div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
