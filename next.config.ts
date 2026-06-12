import type { NextConfig } from "next";

const SUPABASE_URL = "https://iajkipugoylzmjsrnflh.supabase.co";
const SUPABASE_WS  = "wss://iajkipugoylzmjsrnflh.supabase.co";

// Directivas CSP adaptadas a Next.js + Tailwind (unsafe-inline en styles) + Supabase auth/realtime
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Scripts: unsafe-inline necesario en prod porque Next.js inyecta scripts inline de bootstrap.
  // unsafe-eval solo en dev (Fast Refresh / webpack).
  // static.cloudflareinsights.com necesario para Cloudflare Pages Analytics beacon.
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  // Styles: unsafe-inline requerido por Tailwind en producción (no usa nonces por defecto).
  "style-src 'self' 'unsafe-inline'",
  // Fuentes embebidas en CSS (data: URI) usadas por next/font.
  "font-src 'self' data: https://fonts.gstatic.com",
  // Imágenes: self + data URIs (favicons, avatares inline) + HTTPS genérico.
  "img-src 'self' data: blob: https:",
  // Conexiones: self + Supabase REST/auth + WebSocket de Supabase Realtime.
  // En dev se agrega el Supabase local (http://127.0.0.1:54321).
  `connect-src 'self' ${SUPABASE_URL} ${SUPABASE_WS}${process.env.NODE_ENV === "development" ? " http://127.0.0.1:54321 ws://127.0.0.1:54321" : ""}`,
  // Evitar iframes de contenido externo.
  "frame-src 'none'",
  // Fuerza HTTPS en recursos mixtos.
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Evita sniffing de MIME types (protege contra XSS por contenido mal tipado).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking (duplicado con frame-ancestors en CSP para navegadores sin soporte completo).
  { key: "X-Frame-Options", value: "DENY" },
  // No enviar referrer a otros orígenes en requests cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restringir APIs del navegador no usadas.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Forzar HTTPS durante 1 año incluyendo subdominios.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // CSP principal.
  { key: "Content-Security-Policy", value: csp },
];

// Headers que evitan cacheo de respuestas con datos de sesión.
const noCacheHeaders = [
  { key: "Cache-Control", value: "no-store, private" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.20.32"],
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
  },
  async redirects() {
    return [
      {
        source: "/j/:code(\\w{10})",
        destination: "/join/:code",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      // Seguridad global en todas las rutas.
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Evitar cacheo de respuestas con estado de sesión o datos privados.
      {
        source: "/(auth|dashboard|matches|match)(.*)",
        headers: noCacheHeaders,
      },
    ];
  },
};

export default nextConfig;
