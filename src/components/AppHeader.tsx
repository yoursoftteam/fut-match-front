"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppHeader() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="bg-card shadow-sm py-4 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-2xl font-heading font-bold text-primary hover:text-primary/80 transition-colors"
          >
            Parti2
          </Link>
          <nav aria-label="Principal">
            <ul className="flex flex-wrap items-center gap-4 text-sm">
              <li>
                <Link href="/" className="text-foreground hover:text-primary transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="/create"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Armar encuentro
                </Link>
              </li>
              {user && (
                <li>
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Mi Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          {loading ? (
            <span className="text-muted-foreground">Cargando…</span>
          ) : user ? (
            <>
              <span
                className="text-muted-foreground max-w-[200px] truncate"
                title={user.email ?? undefined}
              >
                Hola, {user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
