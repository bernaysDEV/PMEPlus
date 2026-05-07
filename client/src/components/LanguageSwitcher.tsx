import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Pairs of equivalent routes between Arabic (left) and English (right).
// Includes both unprefixed Arabic paths (the default) and legacy `/ar/*` paths
// that still resolve in the router. Both forms map to the same English target,
// and the English target maps back to the unprefixed Arabic path.
const STATIC_EQUIVALENTS: Array<[string, string]> = [
  ["/dashboard/communications", "/en/dashboard/communications"],
  ["/notification-settings", "/en/notification-settings"],
  ["/moment-by-moment", "/en/moment-by-moment"],
  ["/discover-users", "/en/discover-users"],
  ["/daily-brief", "/en/daily-brief"],
  ["/categories", "/en/categories"],
  ["/dashboard", "/en/dashboard"],
  ["/profile", "/en/profile"],
  ["/opinion", "/en/opinion"],
  ["/about", "/en/about"],
  ["/contact", "/en/contact"],
  ["/privacy", "/en/privacy"],
  ["/terms", "/en/terms"],
  ["/accessibility-statement", "/en/accessibility-statement"],
  ["/news", "/en/news"],
  ["/lite", "/en/lite"],
  // Legacy Arabic-prefixed paths still served by the router.
  ["/ar/privacy", "/en/privacy"],
  ["/ar/terms", "/en/terms"],
  ["/ar/accessibility-statement", "/en/accessibility-statement"],
];

// Dynamic prefixes: anything after the prefix is preserved (slugs, ids, query string, etc.)
const DYNAMIC_PREFIXES: Array<[string, string]> = [
  ["/article/", "/en/article/"],
  ["/category/", "/en/category/"],
  ["/keyword/", "/en/keyword/"],
  ["/reporter/", "/en/reporter/"],
];

// Map an Arabic path to its English equivalent (and vice versa).
function mapToLanguage(path: string, target: "ar" | "en"): string {
  const [bare] = path.split(/[?#]/);

  if (target === "en") {
    for (const [ar, en] of STATIC_EQUIVALENTS) {
      if (bare === ar) return en;
    }
    for (const [arPrefix, enPrefix] of DYNAMIC_PREFIXES) {
      if (bare.startsWith(arPrefix)) return enPrefix + bare.slice(arPrefix.length);
    }
    if (bare.startsWith("/en")) return bare;
    if (bare === "/" || bare === "") return "/en";
    return "/en";
  }

  // target === "ar"
  for (const [ar, en] of STATIC_EQUIVALENTS) {
    if (bare === en) return ar;
  }
  for (const [arPrefix, enPrefix] of DYNAMIC_PREFIXES) {
    if (bare.startsWith(enPrefix)) return arPrefix + bare.slice(enPrefix.length);
  }
  if (bare === "/en" || bare === "/en/") return "/";
  if (bare.startsWith("/en")) return "/";
  return bare || "/";
}

export default function LanguageSwitcher() {
  const { setLanguage } = useLanguage();
  const [location, navigate] = useLocation();

  const isEnglish = location.startsWith("/en");
  const isArabic = !isEnglish;

  const handleSwitch = () => {
    if (isArabic) {
      setLanguage("en");
      navigate(mapToLanguage(location, "en"));
    } else {
      setLanguage("ar");
      navigate(mapToLanguage(location, "ar"));
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSwitch}
      className="gap-2"
      data-testid="button-language-switcher"
    >
      {isArabic ? <span>EN</span> : <span>AR</span>}
    </Button>
  );
}
