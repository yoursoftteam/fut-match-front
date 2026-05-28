import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Parti2.app",
  description:
    "Conoce como Parti2.app recopila, usa y protege tus datos personales dentro de la plataforma.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] bg-background px-4 py-10 md:py-14">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Menos chat, mas juego
          </p>
          <h1 className="mb-3 text-3xl font-heading font-bold text-foreground md:text-4xl">
            Politica de Privacidad
          </h1>
          <p className="mb-0 text-sm text-muted-foreground md:text-base">
            Fecha de ultima actualizacion: 27 de mayo de 2026.
          </p>
        </header>

        <article className="card rounded-2xl p-6 md:p-8 space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              1. Responsable del tratamiento
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Parti2.app es responsable del tratamiento de los datos personales
              recolectados a traves de esta plataforma. Si tienes dudas sobre
              privacidad puedes escribirnos a contacto@parti2.co.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              2. Que datos recopilamos
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground md:text-base">
              <li>Datos de cuenta: correo electronico y nombre de perfil.</li>
              <li>
                Datos de uso: partidos creados, inscripciones y actividad dentro
                de la app.
              </li>
              <li>
                Datos tecnicos minimos: identificadores de sesion, navegador y
                metricas basicas de rendimiento.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              3. Para que usamos tu informacion
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground md:text-base">
              <li>Crear y administrar tu cuenta de usuario.</li>
              <li>Permitir la organizacion de partidos y asistencia.</li>
              <li>
                Mejorar la experiencia del producto y prevenir uso fraudulento.
              </li>
              <li>
                Cumplir obligaciones legales y responder solicitudes validas de
                autoridades.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              4. Base legal
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Tratamos tus datos con base en (i) la ejecucion del servicio que
              solicitas al usar Parti2.app, (ii) tu consentimiento cuando aplica,
              y (iii) nuestro interes legitimo de operar una plataforma segura y
              funcional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              5. Compartir informacion con terceros
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              No vendemos tus datos personales. Podemos compartir informacion con
              proveedores tecnologicos que nos ayudan a prestar el servicio
              (autenticacion, base de datos y analitica), bajo obligaciones de
              confidencialidad y seguridad.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              6. Conservacion y seguridad
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Conservamos la informacion durante el tiempo necesario para prestar
              el servicio y cumplir obligaciones legales. Implementamos medidas
              tecnicas y organizativas razonables para proteger tus datos frente
              a accesos no autorizados, perdida o alteracion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              7. Tus derechos
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Puedes solicitar acceso, actualizacion, correccion o eliminacion de
              tus datos personales, asi como revocar consentimientos cuando sea
              procedente, escribiendo a contacto@parti2.co.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              8. Cambios a esta politica
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Podremos actualizar esta Politica de Privacidad para reflejar
              cambios operativos o legales. Publicaremos la version vigente en
              esta misma pagina indicando su fecha de actualizacion.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}