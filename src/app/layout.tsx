import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

export const runtime = "edge";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Parti2 - El ecosistema definitivo para deportistas",
  description:
    "Organiza encuentros de manera gratuita, compite en torneos y encuentra cancha. Todo en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("h-full antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <a href="#main-content" className="skip-to-main">
            Saltar al contenido
          </a>
          <AppHeader />
          <main id="main-content" className="flex-grow scroll-mt-24 tabular-nums">
            {children}
          </main>
          <footer className="bg-card py-6 px-4 border-t border-border">
            <div className="max-w-5xl mx-auto text-center text-muted-foreground text-sm">
              <p>
                © {new Date().getFullYear()} Parti2 — Todos los derechos reservados
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
