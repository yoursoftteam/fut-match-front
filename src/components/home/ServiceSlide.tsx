import Link from "next/link";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export interface SlideData {
  icon: ElementType;
  title: string;
  description: string;
  features: string[];
  badge?: {
    label: string;
    variant: "available" | "new" | "coming";
  };
  cta: {
    label: string;
    href?: string;
  };
  featured?: boolean;
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

const badgeStyles = {
  available:
    "bg-primary/10 text-primary border-primary/20",
  new: "bg-primary/15 text-primary border-primary/30 neon-glow",
  coming: "bg-muted text-muted-foreground border-border",
} as const;

export function ServiceSlide({
  slide,
  isActive,
}: {
  slide: SlideData;
  isActive: boolean;
}) {
  const Icon = slide.icon;

  const cta = slide.cta.href ? (
    <Link
      href={slide.cta.href}
      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 btn-primary-fm cursor-pointer"
    >
      <Icon className="w-4 h-4" />
      {slide.cta.label}
    </Link>
  ) : (
    <span className="inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground px-5 py-2.5 rounded-xl font-bold text-sm cursor-not-allowed">
      <Icon className="w-4 h-4" />
      {slide.cta.label}
    </span>
  );

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${slide.title} — ${slide.badge?.label ?? ""}`}
      className={cn(
        "relative rounded-xl border p-6 sm:p-7 flex flex-col gap-5 h-full transition-all duration-[400ms] ease-[cubic-bezier(0.36,0.07,0.19,0.97)]",
        isActive
          ? "border-primary/30 bg-card shadow-lg"
          : "border-border/50 bg-card/60",
        slide.featured && isActive && "neon-glow border-primary/40"
      )}
    >
      {slide.featured && isActive && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)",
          }}
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
            isActive
              ? "bg-primary/10 border-primary/20"
              : "bg-muted border-border"
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        {slide.badge && (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center gap-1",
              badgeStyles[slide.badge.variant]
            )}
          >
            {slide.badge.variant === "new" && (
              <FlameIcon className="w-3 h-3" />
            )}
            {slide.badge.label}
          </span>
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3">
        <h4 className="text-lg font-heading font-bold text-foreground">
          {slide.title}
        </h4>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {slide.description}
        </p>
        {slide.features.length > 0 && (
          <ul className="space-y-1.5 mt-1">
            {slide.features.map((feat, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                {feat}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10">{cta}</div>
    </div>
  );
}
