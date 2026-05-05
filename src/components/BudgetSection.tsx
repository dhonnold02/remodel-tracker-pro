import { ProjectData } from "@/types/project";
import { Label } from "@/components/ui/label";
import ProgressBar from "./ProgressBar";
import { DollarSign } from "lucide-react";
import { DebouncedNumberInput } from "@/components/inputs/DebouncedInput";

interface BudgetSectionProps {
  data: ProjectData;
  onChange: (data: Partial<ProjectData>) => void;
}

const BudgetSection = ({ data, onChange }: BudgetSectionProps) => {
  const totalSpent = data.laborCosts + data.materialCosts;
  const remaining = data.totalBudget - totalSpent;
  const budgetPercent = data.totalBudget > 0 ? (totalSpent / data.totalBudget) * 100 : 0;

  const formatCompact = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}K`;
    return `${sign}$${abs}`;
  };

  return (
    <div className="bg-white border border-[hsl(214_13%_90%)] rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">Budget Inputs</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="budget" className="text-xs text-muted-foreground font-medium">Total Budget</Label>
          <div className="relative mt-1.5">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedNumberInput
              id="budget"
              placeholder="0"
              value={data.totalBudget}
              onDebouncedChange={(n) => onChange({ totalBudget: n })}
              className="pl-9 rounded-lg h-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="labor" className="text-xs text-muted-foreground font-medium">Labor</Label>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedNumberInput
                id="labor"
                placeholder="0"
                value={data.laborCosts}
                onDebouncedChange={(n) => onChange({ laborCosts: n })}
                className="pl-9 rounded-lg h-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="material" className="text-xs text-muted-foreground font-medium">Materials</Label>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedNumberInput
                id="material"
                placeholder="0"
                value={data.materialCosts}
                onDebouncedChange={(n) => onChange({ materialCosts: n })}
                className="pl-9 rounded-lg h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[hsl(210_20%_98%)] border border-[hsl(214_13%_90%)] px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent</p>
          <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{formatCompact(totalSpent)}</p>
        </div>
        <div className="rounded-lg bg-[hsl(210_20%_98%)] border border-[hsl(214_13%_90%)] px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</p>
          <p className={`text-sm font-semibold tabular-nums mt-0.5 ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>{formatCompact(remaining)}</p>
        </div>
        <div className="rounded-lg bg-[hsl(210_20%_98%)] border border-[hsl(214_13%_90%)] px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Used</p>
          <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">{Math.round(budgetPercent)}%</p>
        </div>
      </div>

      <ProgressBar label="Budget Spent" value={budgetPercent} variant="budget" />
    </div>
  );
};

export default BudgetSection;
