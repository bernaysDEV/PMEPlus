import {
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  useMemo,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";
import { softRetryImport } from "@/lib/softRetryImport";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

interface LazyChunkProps<P> {
  /**
   * Module loader returning the component to render. Should be a stable
   * reference (defined at module scope) so the internal `lazy()` instance
   * isn't re-created on every parent render.
   */
  loader: () => Promise<ComponentType<P>>;
  /**
   * Renders the resolved component. Receives the lazy-wrapped component so
   * the caller can pass props.
   */
  render: (Component: ComponentType<P>) => ReactNode;
  /** Suspense fallback shown while the chunk is downloading. */
  fallback?: ReactNode;
  /**
   * Custom error UI shown after the soft retry helper exhausts its in-flight
   * attempts. If omitted a small inline retry card is rendered using
   * `errorLabel` / `retryLabel`.
   */
  errorFallback?: ReactNode;
  /** User-facing message in the default inline retry card. */
  errorLabel?: string;
  /** User-facing button label in the default inline retry card. */
  retryLabel?: string;
  /** Test id prefix for the default inline retry card. */
  testId?: string;
}

interface DefaultRetryCardProps {
  onRetry: () => void;
  errorLabel: string;
  retryLabel: string;
  testId: string;
}

function DefaultRetryCard({
  onRetry,
  errorLabel,
  retryLabel,
  testId,
}: DefaultRetryCardProps) {
  return (
    <div
      className="bg-muted/20 border border-border rounded-lg p-6 text-center my-4"
      data-testid={testId}
    >
      <p className="text-sm text-muted-foreground mb-3">{errorLabel}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-primary hover:underline inline-flex items-center gap-2"
        data-testid={`${testId}-button`}
      >
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </button>
    </div>
  );
}

/**
 * Drop-in wrapper for an in-page lazy section that should *not* escalate a
 * chunk-load failure to the global ErrorBoundary (which would trigger a
 * full-page cache-bust reload). On a transient chunk failure the user sees a
 * small inline retry card instead of being yanked out of their scroll
 * position.
 *
 * Pair with a stable, module-scope `loader` function — when the user taps
 * retry, the internal `lazy()` instance is re-created so the import is
 * re-attempted (browsers cache previously-rejected dynamic-import promises).
 */
export function LazyChunk<P = Record<string, unknown>>({
  loader,
  render,
  fallback = null,
  errorFallback,
  errorLabel = "تعذّر تحميل هذا القسم",
  retryLabel = "إعادة المحاولة",
  testId = "lazy-chunk",
}: LazyChunkProps<P>) {
  const [version, setVersion] = useState(0);

  const Lazy = useMemo(
    () =>
      lazy(async () => {
        const Component = await softRetryImport(loader);
        return { default: Component as ComponentType<P> };
      }),
    [version, loader],
  );

  return (
    <SectionErrorBoundary
      resetKey={version}
      fallback={
        errorFallback ?? (
          <DefaultRetryCard
            onRetry={() => setVersion((v) => v + 1)}
            errorLabel={errorLabel}
            retryLabel={retryLabel}
            testId={`${testId}-error`}
          />
        )
      }
    >
      <Suspense fallback={fallback}>{render(Lazy)}</Suspense>
    </SectionErrorBoundary>
  );
}
