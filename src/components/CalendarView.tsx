import { useMemo, useState } from "react";
import { Task } from "@/hooks/useProjects";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { parseISO, format, isSameDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  projectName?: string;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-primary",
};

const CalendarView = ({ tasks, projectName }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const tasksWithDates = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate)
      .filter((t) => filterPriority === "all" || t.priority === filterPriority);
  }, [tasks, filterPriority]);

  const dateMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasksWithDates) {
      const key = t.dueDate!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasksWithDates]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return dateMap.get(key) || [];
  }, [selectedDate, dateMap]);

  const modifiers = useMemo(() => {
    const dates = Array.from(dateMap.keys()).map((d) => parseISO(d));
    return { hasTasks: dates };
  }, [dateMap]);

  const modifiersStyles = {
    hasTasks: {
      fontWeight: 700,
      textDecoration: "underline",
      textDecorationColor: "hsl(var(--primary))",
      textUnderlineOffset: "3px",
    },
  };

  if (tasks.filter((t) => t.dueDate).length === 0) {
    return (
      <div className="premium-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="section-title">Calendar</h2>
        </div>
        <p className="text-sm text-muted-foreground">Add due dates to tasks to see them on the calendar.</p>
      </div>
    );
  }

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="section-title">Calendar</h2>
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[100px] h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">🔴 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🔵 Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="p-3 pointer-events-auto rounded-xl border"
        />

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : "Select a date"}
          </p>
          {selectedDate && selectedTasks.length === 0 && (
            <p className="text-xs text-muted-foreground">No tasks due on this date.</p>
          )}
          {selectedTasks.map((t) => (
            <div
              key={t.id}
              className={cn(
                "rounded-xl border p-3 space-y-1 transition-shadow duration-150 hover:shadow-sm",
                t.completed ? "bg-muted/30 opacity-70" : "bg-background"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[t.priority])} />
                <span className={cn("text-sm font-medium truncate", t.completed && "line-through text-muted-foreground")}>
                  {t.title || "Untitled"}
                </span>
                {t.completed && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Done</Badge>}
              </div>
              {t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-4">
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
