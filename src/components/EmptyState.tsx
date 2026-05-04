import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** `page` = generous padding; `compact` = small section. */
  variant?: "page" | "compact";
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "compact",
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed bg-card/40",
        variant === "page" ? "py-16 px-6 gap-4" : "py-10 px-6 gap-3",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted/60 flex items-center justify-center",
          variant === "page" ? "h-16 w-16" : "h-12 w-12"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            variant === "page" ? "h-7 w-7" : "h-5 w-5"
          )}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
};

export default EmptyState;