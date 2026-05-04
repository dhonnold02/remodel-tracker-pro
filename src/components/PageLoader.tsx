import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  /** Use `inline` for inside-card loaders, `page` (default) for full-page. */
  variant?: "page" | "inline";
  className?: string;
}

const PageLoader = ({ message, variant = "page", className }: PageLoaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        variant === "page" ? "min-h-[40vh] py-16" : "py-10",
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
};

export default PageLoader;