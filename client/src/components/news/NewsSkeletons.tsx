import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LeadStorySkeleton() {
  return (
    <Card data-testid="skeleton-lead-story">
      <Skeleton className="aspect-[16/9] w-full md:aspect-[21/9]" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export function SecondaryRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="skeleton-secondary-row"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="aspect-[16/10] w-full" />
          <CardContent className="space-y-2 p-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StreamRowSkeleton() {
  return (
    <div className="space-y-3" data-testid="skeleton-stream-row">
      <Skeleton className="h-5 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="w-[260px] shrink-0 sm:w-[280px]">
            <Skeleton className="aspect-[4/3] w-full" />
            <CardContent className="space-y-2 p-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
