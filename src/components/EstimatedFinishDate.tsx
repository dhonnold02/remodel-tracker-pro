import { Task } from "@/types/project";
import { estimateFinishDate } from "@/lib/estimateFinishDate";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface Props {
  tasks: Task[];
  startDate?: string;
  endDate?: string;
}

const EstimatedFinishDate = ({ tasks, startDate, endDate }: Props) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const result = estimateFinishDate(tasks, startDate);

  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);

  // Compare with user's estimated end date
  let overdue = false;
  if (result && endDate) {
    const userEnd = new Date(endDate);
    if (!isNaN(userEnd.getTime()) && result.date > userEnd) {
      overdue = true;
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Estimated Finish
        </h2>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add tasks to see an estimated finish date.</p>
      ) : allDone ? (
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <p className="text-sm font-medium text-primary">🎉 All tasks complete!</p>
        </div>
      ) : result ? (
        <>
          <div className="flex items-baseline gap-3">
            <p className={`font-heading text-2xl font-bold ${overdue ? "text-destructive" : "text-foreground"}`}>
              {format(result.date, "MMM d, yyyy")}
            </p>
            <span className="text-sm text-muted-foreground">
              ({result.totalWorkDays} work days)
            </span>
          </div>

          {overdue && endDate && (
            <p className="text-xs text-destructive">
              ⚠ This exceeds your target end date of {format(new Date(endDate), "MMM d, yyyy")}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Based on industry-average renovation timelines for each task type.
          </p>

          {/* Breakdown toggle */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
          >
            {showBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showBreakdown ? "Hide" : "Show"} task breakdown
          </button>

          {showBreakdown && (
            <div className="space-y-1">
              {result.taskBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm rounded-md bg-secondary px-3 py-1.5">
                  <span className="text-foreground truncate mr-2">{item.title}</span>
                  <span className="text-muted-foreground whitespace-nowrap">~{item.days}d</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default EstimatedFinishDate;
