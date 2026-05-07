import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, type LucideIcon } from "lucide-react";

type Direction = "rtl" | "ltr";

interface EditorialHeroProps {
  eyebrow: string;
  title: string;
  lead: string;
  meta?: { label: string; value: string }[];
  dir: Direction;
  children?: ReactNode;
}

export function EditorialHero({
  eyebrow,
  title,
  lead,
  meta,
  dir,
  children,
}: EditorialHeroProps) {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.04] border-b border-border"
      data-testid="editorial-hero"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.08) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className={`pointer-events-none absolute top-0 ${
          dir === "rtl" ? "right-0" : "left-0"
        } h-full w-1.5 bg-gradient-to-b from-accent via-primary to-accent`}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28 relative">
        <div className="max-w-4xl">
          <div
            className={`inline-flex items-center gap-2 mb-6 ${
              dir === "rtl" ? "flex-row-reverse" : ""
            }`}
            data-testid="hero-eyebrow"
          >
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground mb-6"
            data-testid="hero-title"
          >
            {title}
          </h1>

          <p
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-3xl"
            data-testid="hero-lead"
          >
            {lead}
          </p>

          {meta && meta.length > 0 && (
            <div
              className="mt-8 flex flex-wrap gap-x-8 gap-y-3 pt-6 border-t border-border/60"
              data-testid="hero-meta"
            >
              {meta.map((m, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {m.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "start" | "center";
  dir: Direction;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "start",
  dir,
}: SectionHeaderProps) {
  const alignCls =
    align === "center"
      ? "text-center mx-auto items-center"
      : dir === "rtl"
      ? "text-right items-start"
      : "text-left items-start";
  return (
    <div
      className={`flex flex-col gap-3 max-w-3xl ${alignCls}`}
      data-testid="section-header"
    >
      {eyebrow && (
        <div
          className={`inline-flex items-center gap-2 ${
            dir === "rtl" ? "flex-row-reverse" : ""
          }`}
        >
          <span className="h-px w-6 bg-accent" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
      {lead && (
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          {lead}
        </p>
      )}
    </div>
  );
}

interface PullQuoteProps {
  quote: string;
  author?: string;
  dir: Direction;
}

export function PullQuote({ quote, author, dir }: PullQuoteProps) {
  return (
    <blockquote
      className={`relative my-8 md:my-12 ${
        dir === "rtl" ? "border-r-4 pr-6 md:pr-8" : "border-l-4 pl-6 md:pl-8"
      } border-accent`}
      data-testid="pull-quote"
    >
      <p className="text-2xl md:text-3xl font-extrabold leading-snug text-foreground tracking-tight">
        &ldquo;{quote}&rdquo;
      </p>
      {author && (
        <footer className="mt-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          — {author}
        </footer>
      )}
    </blockquote>
  );
}

interface CTABandProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  primary?: { label: string; href: string; testId?: string };
  secondary?: { label: string; href: string; testId?: string };
  dir: Direction;
}

export function CTABand({
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  dir,
}: CTABandProps) {
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <section
      className="relative overflow-hidden bg-primary text-primary-foreground"
      data-testid="cta-band"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,.4) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className={`pointer-events-none absolute top-0 ${
          dir === "rtl" ? "left-0" : "right-0"
        } h-full w-1.5 bg-accent`}
        aria-hidden="true"
      />
      <div className="container mx-auto px-4 py-16 md:py-20 relative">
        <div className="max-w-4xl">
          {eyebrow && (
            <div
              className={`inline-flex items-center gap-2 mb-4 ${
                dir === "rtl" ? "flex-row-reverse" : ""
              }`}
            >
              <span className="h-px w-6 bg-primary-foreground/60" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/80">
                {eyebrow}
              </span>
            </div>
          )}
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            {title}
          </h2>
          {lead && (
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed max-w-2xl mb-8">
              {lead}
            </p>
          )}
          {(primary || secondary) && (
            <div className="flex flex-wrap gap-3">
              {primary && (
                <Link href={primary.href}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                    data-testid={primary.testId ?? "button-cta-primary"}
                  >
                    {primary.label}
                    <Arrow className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              {secondary && (
                <Link href={secondary.href}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground"
                    data-testid={secondary.testId ?? "button-cta-secondary"}
                  >
                    {secondary.label}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface CalloutProps {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  tone?: "accent" | "primary" | "warning";
  dir: Direction;
  testId?: string;
}

export function Callout({
  icon: Icon,
  title,
  children,
  tone = "accent",
  dir,
  testId,
}: CalloutProps) {
  const toneCls =
    tone === "primary"
      ? "border-primary/30 bg-primary/[0.06]"
      : tone === "warning"
      ? "border-amber-500/40 bg-amber-500/[0.07]"
      : "border-accent/30 bg-accent/[0.06]";
  const iconWrap =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "warning"
      ? "bg-amber-500 text-white"
      : "bg-accent text-accent-foreground";
  return (
    <aside
      className={`relative rounded-md border p-5 md:p-6 ${toneCls}`}
      data-testid={testId ?? "callout"}
    >
      <div
        className={`flex items-start gap-4 ${
          dir === "rtl" ? "flex-row-reverse text-right" : ""
        }`}
      >
        {Icon && (
          <div
            className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${iconWrap}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-base md:text-lg font-bold text-foreground mb-2">
            {title}
          </h4>
          <div className="text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

export interface DocSection {
  id: string;
  number: string;
  title: string;
  body: ReactNode;
}

interface LongFormDocLayoutProps {
  tocTitle: string;
  sections: DocSection[];
  dir: Direction;
  children?: ReactNode;
}

export function LongFormDocLayout({
  tocTitle,
  sections,
  dir,
  children,
}: LongFormDocLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const handleAnchor = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <aside
            className="lg:col-span-3 order-2 lg:order-1"
            data-testid="doc-toc"
          >
            <div className="lg:sticky lg:top-20">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-4">
                {tocTitle}
              </p>
              <nav>
                <ol className="space-y-1">
                  {sections.map((s) => {
                    const isActive = activeId === s.id;
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={handleAnchor(s.id)}
                          className={`group flex items-baseline gap-3 py-2 ${
                            dir === "rtl" ? "flex-row-reverse text-right" : ""
                          } ${
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          } transition-colors`}
                          data-testid={`toc-link-${s.id}`}
                        >
                          <span
                            className={`text-xs font-mono font-bold tabular-nums ${
                              isActive ? "text-accent" : "text-muted-foreground/60"
                            }`}
                          >
                            {s.number}
                          </span>
                          <span
                            className={`text-sm leading-snug ${
                              isActive ? "font-semibold" : ""
                            }`}
                          >
                            {s.title}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </aside>

          <article
            className="lg:col-span-9 order-1 lg:order-2 max-w-3xl"
            data-testid="doc-content"
          >
            {children}
            <div className="space-y-12 md:space-y-16">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24"
                  data-testid={`doc-section-${s.id}`}
                >
                  <div
                    className={`flex items-baseline gap-4 mb-4 ${
                      dir === "rtl" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span className="text-3xl md:text-4xl font-mono font-bold text-accent tabular-nums leading-none">
                      {s.number}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                      {s.title}
                    </h2>
                  </div>
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-base md:text-[1.05rem] leading-[1.85] text-muted-foreground space-y-4">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

interface InfoStripProps {
  items: { label: string; value: string }[];
  dir: Direction;
}

export function InfoStrip({ items, dir }: InfoStripProps) {
  return (
    <div
      className="border-y border-border bg-muted/40"
      data-testid="info-strip"
    >
      <div className="container mx-auto px-4">
        <dl
          className={`grid grid-cols-2 md:grid-cols-4 divide-x divide-border ${
            dir === "rtl" ? "divide-x-reverse" : ""
          }`}
        >
          {items.map((item, i) => (
            <div key={i} className="px-4 py-5 md:py-6">
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-1">
                {item.label}
              </dt>
              <dd className="text-base md:text-lg font-bold text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
