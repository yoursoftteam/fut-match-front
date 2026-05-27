import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Parti2.app",
  description:
    "Consulta las condiciones de uso de Parti2.app para crear, gestionar y participar en partidos.",
};

export default function TermsAndConditionsPage() {
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
            Terminos y Condiciones
          </h1>
          <p className="mb-0 text-sm text-muted-foreground md:text-base">
            Fecha de ultima actualizacion: 27 de mayo de 2026.
          </p>
        </header>

        <article className="card rounded-2xl p-6 md:p-8 space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              1. Aceptacion de los terminos
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Al acceder o usar Parti2.app aceptas estos Terminos y Condiciones.
              Si no estas de acuerdo, debes abstenerte de utilizar la
              plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              2. Uso de la plataforma
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground md:text-base">
              <li>
                Parti2.app facilita la organizacion de partidos y la gestion de
                participantes.
              </li>
              <li>
                Debes proporcionar informacion veraz y mantenerla actualizada.
              </li>
              <li>
                Eres responsable de toda actividad realizada con tu cuenta.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              3. Conducta del usuario
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              No esta permitido usar la plataforma para actividades ilicitas,
              fraudulentas o que afecten los derechos de terceros. Nos
              reservamos el derecho de suspender cuentas que incumplan estas
              reglas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              4. Partidos, pagos y terceros
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Parti2.app ofrece herramientas de coordinacion y seguimiento. Los
              acuerdos economicos, reservas de canchas y cumplimiento entre
              participantes son responsabilidad directa de los usuarios y de los
              terceros involucrados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              5. Propiedad intelectual
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Los contenidos, marca, interfaz y funcionalidades de Parti2.app
              estan protegidos por derechos de propiedad intelectual. No puedes
              copiar, distribuir o explotar dichos elementos sin autorizacion
              previa y escrita.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              6. Limitacion de responsabilidad
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              En la maxima medida permitida por la ley aplicable, Parti2.app no
              sera responsable por danos indirectos, incidentales o consecuentes
              derivados del uso o imposibilidad de uso del servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              7. Suspensiones y terminacion
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Podemos suspender o terminar el acceso a la plataforma en caso de
              incumplimiento de estos terminos o cuando sea necesario para
              proteger la seguridad y operacion del servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              8. Cambios en los terminos
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Podemos modificar estos Terminos y Condiciones en cualquier
              momento. La version vigente se publicara en esta pagina con su
              respectiva fecha de actualizacion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-heading font-semibold text-foreground">
              9. Contacto
            </h2>
            <p className="mb-0 text-sm leading-7 text-muted-foreground md:text-base">
              Para preguntas legales o solicitudes relacionadas con estos
              terminos puedes escribirnos a contacto@parti2.co.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}