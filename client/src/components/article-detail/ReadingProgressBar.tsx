import { useEffect, useState } from "react";

interface ReadingProgressBarProps {
  targetRef?: React.RefObject<HTMLElement>;
  /**
   * Direction of the surrounding article. Used to localize the
   * accessibility label so screen readers announce the correct language
   * on RTL (Arabic) and LTR (English) article pages.
   */
  dir?: "rtl" | "ltr";
  /**
   * Optional custom accessibility label. Overrides the default localized
   * label derived from `dir`.
   */
  ariaLabel?: string;
}

export function ReadingProgressBar({ targetRef, dir = "rtl", ariaLabel }: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calc = () => {
      const target = targetRef?.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const scrolled = window.scrollY - (target.offsetTop || 0);
        if (total <= 0) {
          setProgress(scrolled > 0 ? 100 : 0);
          return;
        }
        const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
        setProgress(pct);
      } else {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) {
          setProgress(0);
          return;
        }
        const pct = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
        setProgress(pct);
      }
    };

    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [targetRef]);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-transparent z-[60] pointer-events-none"
      role="progressbar"
      aria-label={ariaLabel ?? (dir === "ltr" ? "Reading progress" : "تقدم القراءة")}
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="bar-reading-progress"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
