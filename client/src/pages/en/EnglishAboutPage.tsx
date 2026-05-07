import { Link } from "wouter";
import {
  Sparkles,
  Brain,
  Cpu,
  MessageSquare,
  BarChart3,
  Clock,
  Target,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { EnglishFooter } from "@/components/en/EnglishFooter";
import {
  EditorialHero,
  SectionHeader,
  PullQuote,
  CTABand,
  InfoStrip,
} from "@/components/footer-pages/SharedSections";

const dir = "ltr" as const;

const journey = [
  {
    year: "2007",
    title: "The story begins",
    desc: "Property ME launches from Riyadh as a new editorial voice in Arabic digital media.",
  },
  {
    year: "2012",
    title: "Mass reach",
    desc: "We cross the one million followers mark and become one of the region's leading digital platforms.",
  },
  {
    year: "2018",
    title: "Recognition",
    desc: "We earn local and international awards that recognize the quality of our journalism.",
  },
  {
    year: "2024",
    title: "Smart platform",
    desc: "We launch the new generation of Property ME — a personal reading experience powered by AI.",
  },
  {
    year: "Beyond 2025",
    title: "What comes next",
    desc: "We expand into mobile, video, and interactive formats inside a responsible editorial framework.",
  },
];

const beliefs = [
  {
    title: "Credibility is not optional",
    desc: "Every story moves through layers of editorial verification before it reaches you. Speed never comes before accuracy.",
    icon: Shield,
  },
  {
    title: "Technology serves journalism",
    desc: "We use AI as a tool in the editor's hand — never as a replacement for it.",
    icon: Cpu,
  },
  {
    title: "The reader is the center",
    desc: "We design a personal experience that respects your time and your interests, without trapping you in a bubble.",
    icon: Target,
  },
  {
    title: "Speed with depth",
    desc: "We deliver the breaking moment, then go deeper to explain the why — not only the what.",
    icon: Zap,
  },
];

const aiEdge = [
  {
    title: "Personal recommendations",
    desc: "A system that learns from your reading to suggest what truly matters to you, with full transparency about how it does it.",
    icon: Brain,
  },
  {
    title: "Smart summaries",
    desc: "We generate audio and text summaries for long articles, so you save time without losing context.",
    icon: MessageSquare,
  },
  {
    title: "Credibility analysis",
    desc: "We test content against clear editorial standards and surface the source of every story.",
    icon: BarChart3,
  },
  {
    title: "Live coverage",
    desc: "Real-time tracking of unfolding events with smart updates of the key points — without notification noise.",
    icon: Clock,
  },
];

export default function EnglishAboutPage() {
  return (
    <EnglishLayout>
      <div className="bg-background flex flex-col" dir={dir}>
        <main className="flex-1">
          <EditorialHero
            dir={dir}
            eyebrow="About us"
            title="We write the present, and design how you read it."
            lead="Property ME is a Middle East–based real estate and editorial platform that blends decades of journalistic experience with modern AI tools to bring you the property market the way it deserves to be told: clear, deep, and personal."
            meta={[
              { label: "Founded", value: "2007" },
              { label: "Headquarters", value: "Riyadh, KSA" },
              { label: "Languages", value: "Arabic & English" },
              { label: "Region", value: "Middle East" },
            ]}
          >
            <div className="flex flex-wrap gap-3">
              <Link href="/en/news">
                <Button size="lg" className="gap-2" data-testid="en-button-explore-news">
                  <Sparkles className="w-4 h-4" />
                  Read the latest stories
                </Button>
              </Link>
              <Link href="/en/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  data-testid="en-button-talk-to-us"
                >
                  Talk to the editorial team
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </EditorialHero>

          <InfoStrip
            dir={dir}
            items={[
              { label: "Years of operation", value: "18+" },
              { label: "Monthly readers", value: "5M+" },
              { label: "Editorial team", value: "Saudi-led" },
              { label: "Coverage", value: "24/7" },
            ]}
          />

          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl">
                <SectionHeader
                  dir={dir}
                  eyebrow="The story in one paragraph"
                  title="Arabic-first journalism with a tech soul."
                />
                <div className="mt-8 space-y-5 text-base md:text-lg leading-[1.85] text-muted-foreground">
                  <p>
                    We started with a simple question: how can Arabic journalism
                    keep pace with the shifts in the property market and the
                    digital economy without losing its soul? The answer was not
                    in copying the legacy model, nor in chasing technology
                    blindly — it was in taking a clear editorial stance: content
                    first, technology second.
                  </p>
                  <p>
                    Today, behind Property ME stands a team of editors,
                    analysts, and engineers working hand in hand. We tell the
                    story from the field, enrich it with smart research tools,
                    and deliver it to you in a reading experience that knows
                    you and respects your time.
                  </p>
                </div>

                <PullQuote
                  dir={dir}
                  quote="We don't chase breaking news for the sake of it. We chase the full story."
                  author="Property ME newsroom"
                />
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-muted/40 border-y border-border">
            <div className="container mx-auto px-4">
              <div className="mb-12 md:mb-16">
                <SectionHeader
                  dir={dir}
                  eyebrow="Our journey"
                  title="From a daily news site to a smart platform."
                  lead="The milestones that turned Property ME from a Saudi news outlet into a regional, intelligent platform."
                />
              </div>

              <ol className="grid gap-px bg-border overflow-hidden rounded-md md:grid-cols-2 lg:grid-cols-5 border border-border">
                {journey.map((item, i) => (
                  <li
                    key={i}
                    className="bg-background p-6 md:p-7 flex flex-col gap-3"
                    data-testid={`en-timeline-item-${i}`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground/60 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                        {item.year}
                      </span>
                    </div>
                    <h3
                      className="text-lg md:text-xl font-bold text-foreground leading-snug"
                      data-testid={`en-timeline-title-${i}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="mb-12 md:mb-16">
                <SectionHeader
                  dir={dir}
                  eyebrow="What we believe"
                  title="Four convictions behind every editorial decision."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden border border-border">
                {beliefs.map((b, i) => (
                  <article
                    key={i}
                    className="bg-background p-7 md:p-9 flex gap-5"
                    data-testid={`en-belief-${i}`}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="text-xs font-mono font-bold text-accent tabular-nums">
                          0{i + 1}
                        </span>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                          {b.title}
                        </h3>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-foreground text-background">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5">
                  <div className="inline-flex items-center gap-2 mb-5">
                    <span className="h-px w-8 bg-accent" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                      The smart edge
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                    AI that serves the reader — never replaces the editor.
                  </h2>
                  <p className="text-base md:text-lg text-background/75 leading-relaxed">
                    We invest in technology to extend the editor's capacity and
                    to give you a tailored reading experience, without
                    sacrificing the ethics of the craft or your privacy.
                  </p>
                </div>

                <div className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-background/15 rounded-md overflow-hidden">
                  {aiEdge.map((f, i) => (
                    <div
                      key={i}
                      className="bg-foreground p-6 md:p-7"
                      data-testid={`en-ai-feature-${i}`}
                    >
                      <div className="w-10 h-10 rounded-md bg-background/10 flex items-center justify-center mb-4 text-accent">
                        <f.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-background mb-2 leading-snug">
                        {f.title}
                      </h3>
                      <p className="text-sm text-background/70 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <CTABand
            dir={dir}
            eyebrow="Talk to us"
            title="An open conversation with the newsroom."
            lead="Have a note, a correction, or a story idea? Our door is open. Reach the editorial team directly."
            primary={{
              label: "Contact us",
              href: "/en/contact",
              testId: "en-button-cta-contact",
            }}
            secondary={{
              label: "Read the daily brief",
              href: "/en/daily-brief",
              testId: "en-button-cta-daily-brief",
            }}
          />
        </main>

        <EnglishFooter />
      </div>
    </EnglishLayout>
  );
}
