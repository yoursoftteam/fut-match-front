"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { outfit } from "@/lib/fonts";
import { Menu, X, LogOut, User } from "lucide-react";
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

  const navLinks = [
    ...(!isLoggedIn ? [{ href: "/", label: "Inicio" }] : []),
    { href: "/create", label: "Armar partido" },
    ...(isLoggedIn ? [{ href: "/dashboard", label: "Mi Dashboard" }, { href: "/matches", label: "Mis Partidos" }] : []),
  ];

  const isActive = (href: string) => pathname === href;

  const navItems = (
    <ul className="flex flex-col gap-1">
      {navLinks.map((item) => (
        <li key={item.href}>
          <SheetClose
            nativeButton={false}
            render={
              <Link
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
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
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/60 shadow-sm py-3 px-4 sm:py-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-2xl sm:text-3xl leading-none shrink-0 transition-opacity hover:opacity-80 ${outfit.className} font-bold italic`}
            aria-label="parti2 — inicio"
          >
            <span className="text-foreground">Parti</span>
            <span className="text-emerald-500">2</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Principal" className="max-md:hidden">
            <ul className="flex items-center gap-1 text-sm">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Desktop user */}
          <div className="max-md:hidden flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-muted-foreground text-xs">Cargando…</span>
            ) : user && !isAuthPage ? (
              <>
                <span
                  className="text-muted-foreground max-w-[180px] truncate text-xs"
                  title={user.email ?? undefined}
                >
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted transition-colors cursor-pointer">
              <Menu className="size-5" />
              <span className="sr-only">Menú</span>
            </SheetTrigger>
            <SheetContent side="right" showCloseButton={false} className="p-0 flex flex-col">
              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className={`text-lg font-bold italic ${outfit.className}`}>
                  <span className="text-foreground">Parti</span>
                  <span className="text-emerald-500">2</span>
                </span>
                <SheetClose className="inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <X className="size-4" />
                  <span className="sr-only">Cerrar</span>
                </SheetClose>
              </div>

              {/* Nav */}
              <nav aria-label="Navegación móvil" className="flex-1 overflow-y-auto px-4 py-3">
                {navItems}
              </nav>

              {/* User section */}
              <div className="border-t border-border p-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : user ? (
                  <>
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth"
                    className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm text-center font-medium text-foreground hover:bg-muted transition-colors"
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
