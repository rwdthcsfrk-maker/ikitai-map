import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MapSkeletonProps = {
  className?: string;
};

export default function MapSkeleton({ className }: MapSkeletonProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden rounded-lg", className)}>
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="space-y-3 w-2/3 max-w-xs">
          <Skeleton className="h-4 w-2/3 mx-auto" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6 mx-auto" />
        </div>
      </div>
    </div>
  );
}
