import { ProjectData } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProgressBar from "./ProgressBar";
import { DollarSign } from "lucide-react";

interface BudgetSectionProps {
  data: ProjectData;
  onChange: (data: Partial<ProjectData>) => void;
}

const BudgetSection = ({ data, onChange }: BudgetSectionProps) => {
  const totalSpent = data.laborCosts + data.materialCosts;
  const remaining = data.totalBudget - totalSpent;
  const budgetPercent = data.totalBudget > 0 ? (totalSpent / data.totalBudget) * 100 : 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Budget</h2>

      <div className="space-y-3">
        <div>
          <Label htmlFor="budget" className="text-sm text-muted-foreground">Total Budget</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="budget"
              type="number"
              min={0}
              placeholder="0"
              value={data.totalBudget || ""}
              onChange={(e) => onChange({ totalBudget: Number(e.target.value) || 0 })}
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="labor" className="text-sm text-muted-foreground">Labor Estimate</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="labor"
                type="number"
                min={0}
                placeholder="0"
                value={data.laborCosts || ""}
                onChange={(e) => onChange({ laborCosts: Number(e.target.value) || 0 })}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="material" className="text-sm text-muted-foreground">Material Costs</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="material"
                type="number"
                min={0}
                placeholder="0"
                value={data.materialCosts || ""}
                onChange={(e) => onChange({ materialCosts: Number(e.target.value) || 0 })}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="font-heading text-base font-bold text-foreground">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={`font-heading text-base font-bold ${remaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="font-heading text-base font-bold text-foreground">{Math.round(budgetPercent)}%</p>
        </div>
      </div>

      <ProgressBar label="Budget Spent" value={budgetPercent} variant="budget" />
    </div>
  );
};

export default BudgetSection;
