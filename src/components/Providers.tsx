"use client";

import { ThemeProvider } from "@teispace/next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePWA } from "@/lib/pwa-register";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UpdateToast } from "@/components/UpdateToast";

export function Providers({ children }: { children: React.ReactNode }) {
  const { isUpdateAvailable, isOnline } = usePWA({
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    vapidPublicKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "",
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          {!isOnline && <OfflineBanner />}
          {children}
          {isUpdateAvailable && <UpdateToast />}
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
