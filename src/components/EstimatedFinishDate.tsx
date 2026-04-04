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

  let overdue = false;
  if (result && endDate) {
    const userEnd = new Date(endDate);
    if (!isNaN(userEnd.getTime()) && result.date > userEnd) overdue = true;
  }

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="section-title">Estimated Finish</h2>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add tasks to see an estimated finish date.</p>
      ) : allDone ? (
        <div className="rounded-xl bg-success/10 p-4 text-center">
          <p className="text-sm font-medium text-success">🎉 All tasks complete!</p>
        </div>
      ) : result ? (
        <>
          <div className="flex items-baseline gap-3">
            <p className={`font-heading text-2xl font-bold ${overdue ? "text-destructive" : "text-foreground"}`}>
              {format(result.date, "MMM d, yyyy")}
            </p>
            <span className="text-sm text-muted-foreground">({result.totalWorkDays} work days)</span>
          </div>
          {overdue && endDate && (
            <p className="text-xs text-destructive">⚠ Exceeds target end date of {format(new Date(endDate), "MMM d, yyyy")}</p>
          )}
          <p className="text-xs text-muted-foreground">Based on industry-average renovation timelines.</p>
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
                <div key={i} className="flex items-center justify-between text-sm rounded-xl bg-secondary px-4 py-2">
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
