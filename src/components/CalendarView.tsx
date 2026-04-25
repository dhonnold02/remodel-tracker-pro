import { useMemo, useState } from "react";
import { Task } from "@/hooks/useProjects";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { parseISO, format, isValid } from "date-fns";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { phaseColor } from "@/lib/phaseColors";

interface Props {
  tasks: Task[];
  projectName?: string;
  phases?: string[];
}

interface DayPhaseEntry {
  phase: string;
  index: number;
  tasks: Task[];
}

const safeParse = (d?: string | null): Date | null => {
  if (!d) return null;
  try {
    const p = parseISO(d);
    return isValid(p) ? p : null;
  } catch {
    return null;
  }
};

const CalendarView = ({ tasks, phases }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const phaseOrder = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    if (phases) phases.forEach((p) => { if (!seen.has(p)) { seen.add(p); out.push(p); } });
    for (const t of tasks) {
      const p = t.phase || "General";
      if (!seen.has(p)) { seen.add(p); out.push(p); }
    }
    return out;
  }, [phases, tasks]);

  // Group tasks by date → by phase
  const dateMap = useMemo(() => {
    const map = new Map<string, Map<string, Task[]>>();
    for (const t of tasks) {
      if (!t.dueDate || t.parentTaskId) continue;
      const key = t.dueDate;
      const phase = t.phase || "General";
      if (!map.has(key)) map.set(key, new Map());
      const phaseMap = map.get(key)!;
      if (!phaseMap.has(phase)) phaseMap.set(phase, []);
      phaseMap.get(phase)!.push(t);
    }
    return map;
  }, [tasks]);

  const selectedEntries: DayPhaseEntry[] = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    const phaseMap = dateMap.get(key);
    if (!phaseMap) return [];
    return phaseOrder
      .filter((p) => phaseMap.has(p))
      .map((p) => ({
        phase: p,
        index: phaseOrder.indexOf(p),
        tasks: phaseMap.get(p)!,
      }));
  }, [selectedDate, dateMap, phaseOrder]);

  // Build modifiers per phase so we can color dates with the phase color
  const { modifiers, modifiersStyles } = useMemo(() => {
    const mods: Record<string, Date[]> = {};
    const styles: Record<string, React.CSSProperties> = {};

    phaseOrder.forEach((phase, i) => {
      const dates: Date[] = [];
      for (const [dateStr, phaseMap] of dateMap.entries()) {
        if (!phaseMap.has(phase)) continue;
        const d = safeParse(dateStr);
        if (d) dates.push(d);
      }
      if (dates.length === 0) return;
      const key = `phase_${i}`;
      mods[key] = dates;
      const c = phaseColor(i);
      styles[key] = {
        fontWeight: 600,
        color: c.bar,
        backgroundColor: c.soft,
        borderRadius: "8px",
      };
    });
    return { modifiers: mods, modifiersStyles: styles };
  }, [dateMap, phaseOrder]);

  if (dateMap.size === 0) {
    return (
      <div className="premium-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="section-title">Phase Calendar</h2>
        </div>
        <p className="text-sm text-muted-foreground">Add due dates to tasks to see phase events on the calendar.</p>
      </div>
    );
  }

  // Active phases (those with at least one dated task) — for legend
  const activePhases = phaseOrder
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      for (const phaseMap of dateMap.values()) if (phaseMap.has(p)) return true;
      return false;
    });

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="section-title">Phase Calendar</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Phases shown · click a date</span>
      </div>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
        {activePhases.map(({ p, i }) => {
          const c = phaseColor(i);
          return (
            <span key={p} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block h-2.5 w-3 rounded" style={{ background: c.bar }} />
              <span>{p}</span>
            </span>
          );
        })}
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
          {selectedDate && selectedEntries.length === 0 && (
            <p className="text-xs text-muted-foreground">No phase activity on this date.</p>
          )}
          {selectedEntries.map((entry) => {
            const c = phaseColor(entry.index);
            const completed = entry.tasks.filter((t) => t.completed).length;
            const allDone = completed === entry.tasks.length;
            return (
              <div
                key={entry.phase}
                className="rounded-xl border p-3 space-y-2 transition-shadow duration-150 hover:shadow-sm bg-background"
                style={{ borderColor: c.bar + "55" }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.bar }} />
                  <span className="text-sm font-semibold text-foreground">{entry.phase} Phase</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto">
                    {completed}/{entry.tasks.length}
                  </Badge>
                  {allDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </div>
                <ul className="space-y-1 pl-4">
                  {entry.tasks.map((t) => (
                    <li
                      key={t.id}
                      className={cn(
                        "text-xs flex items-center gap-2",
                        t.completed && "line-through text-muted-foreground"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="truncate">{t.title || "Untitled"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
