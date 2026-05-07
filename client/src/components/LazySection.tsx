import {
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";
import { useInViewport } from "@/hooks/useInViewport";
import { softRetryImport } from "@/lib/softRetryImport";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export function SectionSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-muted/30 rounded-lg"
      style={{ height }}
    />
  );
}

export function SectionInlineRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="bg-muted/20 border border-border rounded-lg p-6 text-center my-4"
      data-testid="section-inline-error"
    >
      <p className="text-sm text-muted-foreground mb-3">
        تعذّر تحميل هذا القسم
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-primary hover:underline inline-flex items-center gap-2"
        data-testid="button-section-retry"
      >
        <RefreshCw className="h-4 w-4" />
        إعادة المحاولة
      </button>
    </div>
  );
}

export interface LazySectionProps<P> {
  loader: () => Promise<ComponentType<P>>;
  render: (Component: ComponentType<P>) => ReactNode;
  minHeight?: number;
  /**
   * If set, the section is loaded immediately instead of waiting for it to
   * scroll into view. Use for components that already sit at/near the top of
   * the page.
   */
  eager?: boolean;
}

/**
 * Below-the-fold lazy section used by the Arabic home page. A chunk-load
 * failure surfaces an inline retry placeholder via `SectionErrorBoundary`
 * instead of escalating to the global ErrorBoundary (which would trigger a
 * full-page cache-bust reload).
 *
 * Pair with stable, module-scope `loader` functions — bumping the internal
 * `version` on retry re-creates the `lazy()` instance so the dynamic
 * `import()` is invoked again instead of returning the previously-rejected
 * cached promise.
 */
export function LazySection<P = Record<string, unknown>>({
  loader,
  render,
  minHeight = 200,
  eager = false,
}: LazySectionProps<P>) {
  const [ref, isVisible] = useInViewport<HTMLDivElement>({ rootMargin: '300px' });
  const [shouldRender, setShouldRender] = useState(eager);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if ((isVisible || eager) && !shouldRender) {
      startTransition(() => {
        setShouldRender(true);
      });
    }
  }, [isVisible, shouldRender, eager]);

  const Lazy = useMemo(
    () =>
      lazy(async () => {
        const Component = await softRetryImport(loader);
        return { default: Component as ComponentType<P> };
      }),
    [version, loader],
  );

  const handleRetry = () => {
    setVersion((v) => v + 1);
  };

  return (
    <div ref={ref} style={{ minHeight: shouldRender ? undefined : minHeight }}>
      {shouldRender ? (
        <SectionErrorBoundary
          resetKey={version}
          fallback={<SectionInlineRetry onRetry={handleRetry} />}
        >
          <Suspense fallback={<SectionSkeleton height={minHeight} />}>
            {render(Lazy as unknown as ComponentType<P>)}
          </Suspense>
        </SectionErrorBoundary>
      ) : (
        <SectionSkeleton height={minHeight} />
      )}
    </div>
  );
}
