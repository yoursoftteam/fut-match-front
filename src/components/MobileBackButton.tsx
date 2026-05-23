"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function MobileBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const hideOnThisPage = pathname === "/dashboard" || pathname === "/";
  if (hideOnThisPage) return null;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="md:hidden border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto max-w-5xl px-4 py-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
          aria-label="Regresar a la pagina anterior"
        >
          <ChevronLeft className="size-4" />
          Regresar
        </button>
      </div>
    </div>
  );
}
