import { Component, ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { hardReset, resetAllRecoveryCounters } from "@/lib/cacheBust";

const CHUNK_RECOVERY_ERROR = 'CHUNK_LOAD_RECOVERY_PENDING';

function isRecoveryPending(error: Error | null): boolean {
  if (!error) return false;
  return (error.message || '').includes(CHUNK_RECOVERY_ERROR);
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RELOAD_KEY = 'sabq_chunk_reload';
const RELOAD_TIMEOUT = 30000;

function isChunkLoadError(error: Error): boolean {
  const message = error?.message?.toLowerCase() || '';
  const errorString = error?.toString()?.toLowerCase() || '';

  // Don't treat our own recovery sentinel as a chunk load error.
  if (message.includes('chunk_load_recovery_pending')) return false;

  return (
    message.includes('importing binding name') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    errorString.includes('chunkloaderror') ||
    message.includes('unable to preload css') ||
    message.includes('importing a module script failed')
  );
}

function shouldAutoReload(): boolean {
  const lastReload = sessionStorage.getItem(RELOAD_KEY);
  if (!lastReload) return true;
  
  const timeSinceReload = Date.now() - parseInt(lastReload, 10);
  return timeSinceReload > RELOAD_TIMEOUT;
}

function markReloadAttempt(): void {
  sessionStorage.setItem(RELOAD_KEY, Date.now().toString());
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    if (isChunkLoadError(error) && shouldAutoReload()) {
      console.log('[ErrorBoundary] Chunk load error detected, reloading page...');
      markReloadAttempt();
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      if (isRecoveryPending(this.state.error)) {
        return (
          <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  جاري إعادة تحميل الصفحة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  حدث تحديث للصفحة في الخلفية. اضغط على «إعادة المحاولة» لمتابعة التصفح.
                </p>
                <Button
                  onClick={() => {
                    // Explicit user retry — clear every recovery counter
                    // (including the persistent hard-reset circuit breaker)
                    // so the user is never trapped here.
                    resetAllRecoveryCounters();
                    hardReset();
                  }}
                  className="w-full"
                  data-testid="button-recovery-retry"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                حدث خطأ غير متوقع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                عذراً، حدث خطأ أثناء عرض هذه الصفحة. الرجاء تحديث الصفحة أو المحاولة لاحقاً.
              </p>
              {this.state.error && (
                <details className="text-xs bg-muted p-3 rounded">
                  <summary className="cursor-pointer font-medium">
                    تفاصيل تقنية
                  </summary>
                  <pre className="mt-2 overflow-x-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                data-testid="button-reload"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث الصفحة
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
