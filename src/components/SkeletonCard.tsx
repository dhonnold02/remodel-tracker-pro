import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

/**
 * Shared skeleton card matching Sightline's card style.
 * Used across Dashboard, ProjectDetail, and CommandCenter loading states.
 */
const SkeletonCard = ({ lines = 3, className }: SkeletonCardProps) => (
  <div className={cn("bg-card rounded-2xl p-5 border border-border space-y-3", className)}>
    <Skeleton className="h-5 w-1/2 rounded-xl" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-4 rounded-xl"
        style={{ width: `${60 + ((i * 17) % 35)}%` }}
      />
    ))}
  </div>
);

export default SkeletonCard;
