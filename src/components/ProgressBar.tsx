import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  value: number;
  variant?: "budget" | "completion";
}

const ProgressBar = ({ label, value, variant = "budget" }: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value));
  const isOverBudget = variant === "budget" && value > 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn(
          "text-xs font-heading font-semibold",
          isOverBudget ? "text-destructive" : "text-foreground"
        )}>
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full progress-bar-fill",
            variant === "budget"
              ? isOverBudget
                ? "bg-destructive"
                : "bg-primary"
              : "bg-success"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
