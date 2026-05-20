"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["700"],
  style: ["italic"],
});

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const isAuthPage = pathname === "/auth";

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
            className={`text-2xl sm:text-3xl leading-none transition-opacity hover:opacity-80 ${inter.className} font-bold italic`}
          >
            <span className="text-black dark:text-white">Parti</span>
            <span className="text-emerald-500">2</span>
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
                  Armar partido
                </Link>
              </li>
              {user && !isAuthPage && (
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
          ) : user && !isAuthPage ? (
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
