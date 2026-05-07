import { useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { cacheBustReload } from "@/lib/cacheBust";

export function UpdateAvailableBanner() {
  const { updateAvailable } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  const handleUpdate = () => {
    cacheBustReload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[10000] w-full border-b bg-card text-card-foreground shadow-sm"
      data-testid="banner-update-available"
    >
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span data-testid="text-update-available" className="truncate">
            تتوفر نسخة جديدة من الموقع. اضغط «تحديث» للحصول على آخر التحسينات.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleUpdate}
            data-testid="button-update-now"
          >
            <RefreshCw className="ml-1 h-3 w-3" aria-hidden="true" />
            تحديث
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDismissed(true)}
            aria-label="إغلاق"
            data-testid="button-dismiss-update"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
