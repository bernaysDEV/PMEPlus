import { Component, ReactNode } from "react";
import { isChunkErrorMessage, isRecoveryError } from "@/lib/softRetryImport";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  /**
   * When this value changes, the boundary resets its `hasError` state. Use it
   * to recover after the user clicks an inline retry button (e.g. by bumping
   * a version counter that also re-creates the lazy loader).
   */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches *chunk-load* errors from a single below-the-fold lazy section so
 * they never escalate to the global ErrorBoundary (which would trigger a
 * full-page cache-bust reload). Renders the provided `fallback` (typically
 * an inline retry card) for those failures.
 *
 * Genuine runtime errors thrown by section code are re-thrown from `render`
 * so the parent / global ErrorBoundary still surfaces them — we don't want
 * to silently mask real bugs behind an "إعادة المحاولة" button.
 *
 * Recovery is driven by `resetKey`: when the parent bumps it (e.g. the user
 * tapped retry), the boundary clears its error state so the children
 * re-mount and the lazy loader is invoked again with a fresh promise.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error) {
    console.warn(
      '[SectionErrorBoundary] Section error caught:',
      error?.message || error,
    );
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const isHandled = isRecoveryError(err) || isChunkErrorMessage(err?.message);
      if (!isHandled && err) {
        // Real bug, not a transient chunk load — let it bubble up to the
        // global ErrorBoundary so the user / engineer actually sees it.
        throw err;
      }
      return this.props.fallback;
    }
    return this.props.children;
  }
}
