import { Link } from "wouter";
import { useState, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  ArrowUp,
  Mail,
  ChevronDown,
  Building2,
  MapPin,
  Briefcase,
  LayoutGrid,
  Send,
} from "lucide-react";
import { SiX, SiTiktok, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import sabqLogo from "@assets/property-me-logo.png";
import type { Category } from "@shared/schema";

interface FooterColumn {
  title: string;
  icon: typeof Building2;
  links: { label: string; href: string }[];
}

interface TopCity {
  name: string;
  count: number;
}

const SERVICES_COLUMN: FooterColumn = {
  title: "خدمات",
  icon: Briefcase,
  links: [
    { label: "متجر الإعلام", href: "/media-store" },
    { label: "النشرة البريدية", href: "/newsletter" },
    { label: "البودكاست الصوتي", href: "/audio-newsletters" },
    { label: "الموجز اليومي", href: "/daily-brief" },
    { label: "شورتس", href: "/shorts" },
    { label: "آخر الأخبار", href: "/news" },
  ],
};

const INFO_LINKS = [
  { label: "من نحن", href: "/about" },
  { label: "اتصل بنا", href: "/contact" },
  { label: "سياسة الخصوصية", href: "/ar/privacy" },
  { label: "شروط الاستخدام", href: "/ar/terms" },
];

const SOCIAL_LINKS = [
  { icon: SiX, href: "https://x.com/PropertyMENA", label: "إكس" },
  { icon: Facebook, href: "https://www.facebook.com/PropertyMiddleEast", label: "فيسبوك" },
  { icon: Instagram, href: "https://www.instagram.com/propertymiddleeast", label: "إنستغرام" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/property-middle-east", label: "لينكدإن" },
  { icon: SiWhatsapp, href: "https://whatsapp.com/channel/0029VajXjkDAzNbzO6RwPy0q", label: "واتساب" },
];

function MobileCollapsible({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-sidebar-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-sm font-semibold text-sidebar-foreground"
        data-testid={`collapsible-${title}`}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-sidebar-primary" />
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  const { data: categoriesRaw } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: topCitiesRaw } = useQuery<TopCity[]>({
    queryKey: ["/api/top-cities"],
  });

  const coreCategories = useMemo(() => {
    const list = Array.isArray(categoriesRaw) ? categoriesRaw : [];
    return list
      .filter(
        (cat) =>
          cat.status === "active" &&
          cat.type === "core",
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categoriesRaw]);

  const categoriesColumn: FooterColumn | null = coreCategories.length > 0
    ? {
        title: "التصنيفات",
        icon: LayoutGrid,
        links: coreCategories.map((cat) => ({
          label: cat.nameAr,
          href: `/category/${cat.slug}`,
        })),
      }
    : null;

  const citiesColumn: FooterColumn | null = useMemo(() => {
    const cities = Array.isArray(topCitiesRaw) ? topCitiesRaw : [];
    if (cities.length === 0) return null;
    return {
      title: "المدن",
      icon: MapPin,
      links: cities.map((city) => ({
        label: city.name,
        href: `/keyword/${encodeURIComponent(city.name)}`,
      })),
    };
  }, [topCitiesRaw]);

  const allColumns = useMemo(() => {
    const cols: FooterColumn[] = [];
    if (categoriesColumn) cols.push(categoriesColumn);
    if (citiesColumn) cols.push(citiesColumn);
    cols.push(SERVICES_COLUMN);
    return cols;
  }, [categoriesColumn, citiesColumn]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      id="footer"
      className="bg-sidebar text-sidebar-foreground"
      data-testid="footer"
      dir="rtl"
    >
      {/* ============= TOP NEWSLETTER STRIP ============= */}
      <div className="border-b border-sidebar-border">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-right">
            <div className="hidden md:flex w-11 h-11 rounded-full bg-sidebar-primary/15 items-center justify-center">
              <Send className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-sidebar-foreground">
                اشترك في النشرة العقارية
              </h3>
              <p className="text-xs md:text-sm text-sidebar-foreground/70">
                أحدث الأخبار والصفقات الحصرية أسبوعيًا في بريدك
              </p>
            </div>
          </div>
          <form
            className="flex w-full md:w-auto gap-2"
            onSubmit={(e) => e.preventDefault()}
            data-testid="form-newsletter"
          >
            <Input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="md:w-72 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              data-testid="input-newsletter-email"
            />
            <Button
              type="submit"
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 whitespace-nowrap"
              data-testid="button-newsletter-subscribe"
            >
              اشترك
            </Button>
          </form>
        </div>
      </div>

      {/* ============= MAIN GRID ============= */}
      <div className="container mx-auto px-4 py-10">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-8">
          {/* Brand column */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <Link href="/" data-testid="footer-logo">
              <img
                src={sabqLogo}
                alt="بروبرتي ME"
                className="h-10 w-auto"
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-sidebar-foreground/75 leading-relaxed max-w-xs">
              المنصة الرائدة لأخبار العقارات في منطقة الشرق الأوسط — تغطية شاملة
              وتحليلات متخصصة وقصص فريدة لسوق العقار المتغيّر.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {SOCIAL_LINKS.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-md bg-sidebar-accent hover-elevate active-elevate-2 flex items-center justify-center text-sidebar-foreground"
                  aria-label={s.label}
                  data-testid={`link-social-${s.label}`}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Category columns */}
          <div className="md:col-span-9 grid grid-cols-2 lg:grid-cols-3 gap-6">
            {allColumns.map((col) => (
              <div key={col.title}>
                <h4 className="flex items-center gap-2 text-sm font-bold text-sidebar-foreground mb-4">
                  <col.icon className="h-4 w-4 text-sidebar-primary" />
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>
                        <span
                          className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer"
                          data-testid={`link-${link.href}`}
                        >
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-1">
          {/* Brand centered */}
          <div className="flex flex-col items-center gap-2 mb-4 pb-4 border-b border-sidebar-border">
            <Link href="/" data-testid="footer-logo-mobile">
              <img
                src={sabqLogo}
                alt="بروبرتي ME"
                className="h-10 w-auto"
                loading="lazy"
              />
            </Link>
            <p className="text-xs text-sidebar-foreground/70 text-center max-w-[16rem]">
              المنصة الأولى لأخبار العقار في الشرق الأوسط
            </p>
          </div>

          {allColumns.map((col) => (
            <MobileCollapsible key={col.title} title={col.title} icon={col.icon}>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </MobileCollapsible>
          ))}

          {/* Mobile social */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-5">
            {SOCIAL_LINKS.map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-md bg-sidebar-accent hover-elevate active-elevate-2 flex items-center justify-center text-sidebar-foreground"
                aria-label={s.label}
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ============= BOTTOM BAR ============= */}
      <div className="border-t border-sidebar-border">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {INFO_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer">
                    {link.label}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact">
                <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors cursor-pointer">
                  <Mail className="h-3 w-3" />
                  راسلنا
                </span>
              </Link>
            </li>
          </ul>

          <div className="flex flex-col md:flex-row items-center gap-3 text-xs text-sidebar-foreground/70">
            <p>
              © {currentYear} بروبرتي ME — جميع الحقوق محفوظة
            </p>
            <a
              href="https://replit.com"
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="flex items-center gap-1.5 hover:text-sidebar-foreground transition-colors"
              aria-label="Built by Replit"
            >
              <span>Built by</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <path fill="#F26207" d="M7 5.5C7 4.67157 7.67157 4 8.5 4H15.5C16.3284 4 17 4.67157 17 5.5V12H8.5C7.67157 12 7 11.3284 7 10.5V5.5Z" />
                <path fill="#F26207" d="M17 12H25.5C26.3284 12 27 12.6716 27 13.5V18.5C27 19.3284 26.3284 20 25.5 20H17V12Z" />
                <path fill="#F26207" d="M7 21.5C7 20.6716 7.67157 20 8.5 20H17V28H8.5C7.67157 28 7 27.3284 7 26.5V21.5Z" />
              </svg>
              <span>Replit</span>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg hover:bg-sidebar-primary/90 transition-colors flex items-center justify-center"
        aria-label="العودة إلى الأعلى"
        data-testid="scroll-to-top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </footer>
  );
}
