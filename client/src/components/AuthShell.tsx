import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import logoWhite from "@assets/3500x1080-Logo-White_1776604119190.png";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  backHref?: string;
  backLabel?: string;
  footer?: React.ReactNode;
  side?: React.ReactNode;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  badge,
  backHref = "/",
  backLabel = "العودة للرئيسية",
  footer,
  side,
}: AuthShellProps) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-background"
      dir="rtl"
    >
      {/* Brand-tinted aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 80% -10%, hsl(var(--accent) / 0.32), transparent 60%), radial-gradient(ellipse 80% 60% at 10% 110%, hsl(var(--primary) / 0.45), transparent 60%), linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--accent) / 0.06))",
        }}
      />

      {/* Geometric Arabic-inspired pattern */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] dark:opacity-[0.10]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="auth-lattice"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(15)"
          >
            <path
              d="M40 0 L80 40 L40 80 L0 40 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-foreground"
            />
            <circle
              cx="40"
              cy="40"
              r="6"
              fill="currentColor"
              className="text-foreground"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-lattice)" />
      </svg>

      {/* Floating decorative orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40"
        style={{ background: "hsl(var(--accent) / 0.7)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40"
        style={{ background: "hsl(var(--primary) / 0.7)" }}
      />

      {/* Decorative arch silhouette (Middle Eastern architectural cue) */}
      <svg
        aria-hidden
        viewBox="0 0 200 240"
        className="pointer-events-none absolute -bottom-10 right-1/2 hidden h-[28rem] w-[28rem] -translate-x-1/2 translate-x-[55%] opacity-[0.08] dark:opacity-[0.12] md:block"
      >
        <path
          d="M20 240 V100 A80 80 0 0 1 180 100 V240"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
        />
        <path
          d="M40 240 V110 A60 60 0 0 1 160 110 V240"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
        />
        <path
          d="M60 240 V120 A40 40 0 0 1 140 120 V240"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
        />
      </svg>

      {/* Top bar with back link */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-5 sm:px-8 sm:pt-7">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground/80 transition-colors hover-elevate"
          data-testid="link-back-home"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-medium tracking-wide text-foreground/70 backdrop-blur-md">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
          />
          بروبرتي ME
        </div>
      </div>

      {/* Main composition */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8 px-4 pb-10 pt-6 sm:px-8 lg:flex-row lg:items-stretch lg:gap-12 lg:pt-10">
        {/* Brand panel — visible on lg+ */}
        <aside
          className="hidden w-full max-w-md flex-col justify-between rounded-2xl border border-white/15 p-8 text-white shadow-2xl lg:flex"
          style={{
            background:
              "linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(238 45% 22%) 55%, hsl(var(--accent) / 0.85) 100%)",
          }}
        >
          {/* Top: Logo */}
          <div>
            <img
              src={logoWhite}
              alt="بروبرتي ME"
              className="h-10 w-auto"
              loading="lazy"
              data-testid="img-auth-logo"
            />
            <h2 className="mt-8 text-2xl font-bold leading-snug xl:text-3xl">
              بوابتك الذكية إلى عقارات الشرق الأوسط
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80 xl:text-base">
              منصّة بروبرتي ME تجمع بيانات السوق، أخبار القطاع، وأدوات
              ذكاء اصطناعي في مكان واحد لتُمكّنك من اتخاذ قرارات أفضل.
            </p>
          </div>

          {/* Custom right-panel content (e.g. benefits) */}
          {side ? <div className="my-8">{side}</div> : null}

          {/* Bottom: signature */}
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3 text-xs text-white/70">
              <div className="h-px flex-1 bg-white/20" />
              <span>حيث تلتقي الثقة بالمصداقية</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>
          </div>
        </aside>

        {/* Glass card with form */}
        <main className="w-full max-w-md">
          <div
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            style={{
              boxShadow:
                "0 24px 60px -20px hsl(var(--primary) / 0.35), 0 8px 24px -10px hsl(var(--accent) / 0.25)",
            }}
          >
            {/* Top accent bar */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            />

            {/* Mobile-only mini logo */}
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
              >
                <span className="text-sm font-bold tracking-tight">
                  بروبرتي ME
                </span>
              </div>
              {badge ? (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent-foreground/90">
                  {badge}
                </span>
              ) : null}
            </div>

            {/* Header */}
            <div className="mb-6">
              {badge ? (
                <span
                  className="mb-3 hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide lg:inline-block"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {badge}
                </span>
              ) : null}
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {/* Form body */}
            <div>{children}</div>

            {/* Footer slot */}
            {footer ? (
              <div className="mt-6 border-t border-border/60 pt-5">
                {footer}
              </div>
            ) : null}
          </div>

          {/* Subtle helper line under card */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            بحماية كاملة لبياناتك وفق سياسة الخصوصية الخاصة بنا.
          </p>
        </main>
      </div>
    </div>
  );
}
