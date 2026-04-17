import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "FutMatch - El ecosistema definitivo para futbolistas",
  description: "Organiza cotejos de manera gratuita, compite en torneos y encuentra cancha. Todo en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <AppHeader />
          <main className="flex-grow">
            {children}
          </main>
          <footer className="bg-card py-6 px-4 border-t border-border">
            <div className="max-w-5xl mx-auto text-center text-muted-foreground text-sm">
              <p>© {new Date().getFullYear()} FutMatch - Todos los derechos reservados</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
