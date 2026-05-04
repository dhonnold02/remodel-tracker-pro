import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

/**
 * Shared section header used across Settings, Command Center, and other pages.
 * Keeps title typography, muted subtitle styling, and vertical spacing consistent.
 */
const SectionHeader = ({ title, subtitle, icon: Icon, className }: SectionHeaderProps) => (
  <header className={cn("flex items-start gap-3", className)}>
    {Icon && (
      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="min-w-0">
      <h2 className="font-heading text-base md:text-lg font-semibold text-foreground leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  </header>
);

export default SectionHeader;
