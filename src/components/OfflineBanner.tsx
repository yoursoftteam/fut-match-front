"use client";

export function OfflineBanner() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-600 text-white text-center py-2 px-4 text-sm"
      role="status"
      aria-live="polite"
    >
      Sin conexion — algunos datos pueden no estar disponibles
    </div>
  );
}
