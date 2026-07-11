import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MailIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MobileBackButton } from "@/components/MobileBackButton";
import { Providers } from "@/components/Providers";
import { geist, outfit, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  applicationName: "Parti2",
  title: {
    default: "Parti2 - El ecosistema definitivo para deportistas",
    template: "%s | Parti2",
  },
  description:
    "Organiza partidos de manera gratuita, compite en torneos y encuentra cancha. Todo en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Parti2",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon-180x180.png", sizes: "180x180" },
      { url: "/icons/apple-icon-167x167.png", sizes: "167x167" },
      { url: "/icons/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/icons/apple-icon-144x144.png", sizes: "144x144" },
      { url: "/icons/apple-icon-120x120.png", sizes: "120x120" },
      { url: "/icons/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/icons/apple-icon-76x76.png", sizes: "76x76" },
      { url: "/icons/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/icons/apple-icon-60x60.png", sizes: "60x60" },
      { url: "/icons/apple-icon-57x57.png", sizes: "57x57" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#22C55E",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full antialiased font-sans",
        spaceGrotesk.variable,
        outfit.variable,
        geist.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <a href="#main-content" className="skip-to-main">
            Saltar al contenido
          </a>
          <AppHeader />
          <MobileBackButton />
          <main id="main-content" className="flex-grow scroll-mt-24 tabular-nums">
            {children}
          </main>
          <footer className="bg-card py-6 px-4 border-t border-border">
            <div className="max-w-5xl mx-auto text-center text-muted-foreground text-sm">
              <p>
                © {new Date().getFullYear()} Parti2 — Todos los derechos reservados
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                <Link
                  href="/privacy"
                  className="text-foreground/90 hover:text-primary transition-colors"
                >
                  Política de Privacidad
                </Link>
                <span className="text-muted-foreground/60" aria-hidden="true">
                  •
                </span>
                <Link
                  href="/terms"
                  className="text-foreground/90 hover:text-primary transition-colors"
                >
                  Términos y Condiciones
                </Link>
              </div>
              <a
                href="mailto:contacto@parti2.co"
                className="mt-2 inline-flex items-center gap-2 text-foreground/90 hover:text-primary transition-colors"
              >
                <MailIcon className="h-4 w-4" aria-hidden="true" />
                <span>contacto@parti2.co</span>
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
