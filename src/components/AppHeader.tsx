"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { outfit } from "@/lib/fonts";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const isAuthPage = pathname === "/auth";
  const isLoggedIn = Boolean(user) && !isAuthPage;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const navItems = (
    <ul className="flex flex-col gap-1">
      {[
        ...(!isLoggedIn ? [{ href: "/", label: "Inicio" }] : []),
        { href: "/create", label: "Armar partido" },
        ...(isLoggedIn ? [{ href: "/dashboard", label: "Mi Dashboard" }] : []),
      ].map((item) => (
        <li key={item.href}>
          <SheetClose
            nativeButton={false}
            render={
              <Link
                href={item.href}
                className="block rounded-lg px-3 py-2 text-base text-foreground hover:bg-muted transition-colors"
              />
            }
          >
            {item.label}
          </SheetClose>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="bg-card shadow-sm py-3 px-4 sm:py-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-2xl sm:text-3xl leading-none shrink-0 transition-opacity hover:opacity-80 ${outfit.className} font-bold italic`}
          >
            <span className="text-black dark:text-white">Parti</span>
            <span className="text-emerald-500">2</span>
          </Link>
          <nav aria-label="Principal" className="max-md:hidden">
            <ul className="flex items-center gap-4 text-sm">
              {!isLoggedIn && (
                <li>
                  <Link href="/" className="text-foreground hover:text-primary transition-colors">
                    Inicio
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/create"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Armar partido
                </Link>
              </li>
              {isLoggedIn && (
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="max-md:hidden flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-muted-foreground">Cargando…</span>
            ) : isLoggedIn ? (
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

          <Sheet>
            <SheetTrigger className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition">
              <Menu className="size-5" />
              <span className="sr-only">Menú</span>
            </SheetTrigger>
            <SheetContent side="right" showCloseButton={false}>
              <div className="flex items-center justify-between p-4 pb-2">
                <span className={`text-lg font-bold italic ${outfit.className}`}>
                  <span className="text-black dark:text-white">Parti</span>
                  <span className="text-emerald-500">2</span>
                </span>
                <SheetClose className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition">
                  <X className="size-4" />
                  <span className="sr-only">Cerrar</span>
                </SheetClose>
              </div>
              <nav aria-label="Navegación móvil" className="px-3">
                {navItems}
              </nav>
              <div className="mt-auto border-t border-border p-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : user ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth"
                    className="block w-full rounded-lg border border-border px-3 py-2 text-sm text-center text-foreground hover:bg-muted transition"
                  >
                    Iniciar Sesión
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
