import { useMemo, useState } from "react";
import { Task } from "@/hooks/useProjects";
import { estimateTaskDays } from "@/lib/estimateFinishDate";
import { format, addBusinessDays, parseISO, differenceInBusinessDays, isValid } from "date-fns";
import { CalendarRange, CheckCircle2, X } from "lucide-react";
import { phaseColor } from "@/lib/phaseColors";

interface Props {
  tasks: Task[];
  startDate?: string;
  phases?: string[];
}

interface PhaseBar {
  phase: string;
  index: number;
  days: number;
  startDay: number;
  tasks: Task[];
  completed: number;
  hasExplicitDates: boolean;
}

const safeParse = (d?: string | null): Date | null => {
  if (!d) return null;
  try {
    const parsed = parseISO(d);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const GanttTimeline = ({ tasks, startDate, phases }: Props) => {
  const [activePhase, setActivePhase] = useState<string | null>(null);

  const projectStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sd = safeParse(startDate);
    if (sd && sd > today) return sd;
    return today;
  }, [startDate]);

  // Group tasks by phase, preserving the configured phase order
  const { bars, totalDays } = useMemo(() => {
    if (tasks.length === 0) return { bars: [] as PhaseBar[], totalDays: 0 };

    // Only top-level tasks (subtasks roll into their parent's phase)
    const topTasks = tasks.filter((t) => !t.parentTaskId);
    const grouped = new Map<string, Task[]>();
    for (const t of topTasks) {
      const p = t.phase || "General";
      if (!grouped.has(p)) grouped.set(p, []);
      grouped.get(p)!.push(t);
    }

    const phaseOrder: string[] = [];
    if (phases && phases.length) phases.forEach((p) => grouped.has(p) && phaseOrder.push(p));
    // Append any phases not in config (shouldn't happen, but safe)
    for (const p of grouped.keys()) if (!phaseOrder.includes(p)) phaseOrder.push(p);

    // Only include phases that have at least one task with an assigned date
    const datedPhases = phaseOrder.filter((phase) => {
      const phaseTasks = grouped.get(phase)!;
      return phaseTasks.some((t) => safeParse(t.dueDate));
    });

    const bars: PhaseBar[] = datedPhases.map((phase, i) => {
      const phaseTasks = grouped.get(phase)!;
      const dated = phaseTasks
        .map((t) => safeParse(t.dueDate))
        .filter((d): d is Date => !!d);

      const earliest = new Date(Math.min(...dated.map((d) => d.getTime())));
      const latest = new Date(Math.max(...dated.map((d) => d.getTime())));
      const startDay = Math.max(0, differenceInBusinessDays(earliest, projectStart));
      const days = Math.max(1, differenceInBusinessDays(latest, earliest) + 1);

      const completed = phaseTasks.filter((t) => t.completed).length;
      return { phase, index: i, days, startDay, tasks: phaseTasks, completed, hasExplicitDates: true };
    });

    const totalDays = Math.max(
      ...bars.map((b) => b.startDay + b.days),
      1
    );
    return { bars, totalDays };
  }, [tasks, phases, projectStart]);

  const milestones = useMemo(() => {
    const out: number[] = [];
    for (let d = 5; d < totalDays; d += 5) out.push(d);
    return out;
  }, [totalDays]);

  if (bars.length === 0) {
    return (
      <div className="premium-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h2 className="section-title">Phase Timeline</h2>
        </div>
        <p className="text-sm text-muted-foreground">Add tasks to see the project timeline by phase.</p>
      </div>
    );
  }

  const BAR_HEIGHT = 36;
  const ROW_GAP = 10;
  const LABEL_WIDTH = 140;
  const DAY_WIDTH = 28;
  const chartWidth = Math.max(totalDays * DAY_WIDTH, 200);
  const chartHeight = bars.length * (BAR_HEIGHT + ROW_GAP) + ROW_GAP;

  const activeBar = bars.find((b) => b.phase === activePhase) || null;

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h2 className="section-title">Phase Timeline</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Click a bar to view tasks</span>
      </div>

      <div className="flex overflow-hidden rounded-xl border bg-background">
        <div className="shrink-0 border-r bg-secondary/30" style={{ width: LABEL_WIDTH }}>
          <div className="h-7 border-b flex items-center px-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Phase</span>
          </div>
          {bars.map((bar) => {
            const color = phaseColor(bar.index);
            const allDone = bar.completed === bar.tasks.length;
            return (
              <button
                key={bar.phase}
                type="button"
                onClick={() => setActivePhase(bar.phase)}
                className="w-full flex items-center gap-2 px-3 text-left transition-colors hover:bg-secondary/60"
                style={{ height: BAR_HEIGHT + ROW_GAP }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: color.bar }}
                />
                <span className="text-xs font-medium truncate text-foreground">{bar.phase}</span>
                {allDone && <CheckCircle2 className="h-3 w-3 text-success shrink-0 ml-auto" />}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto flex-1">
          <div style={{ width: chartWidth, minWidth: "100%" }}>
            <div className="h-7 border-b flex items-end relative">
              {milestones.map((d) => (
                <div key={d} className="absolute top-0 bottom-0 flex items-center" style={{ left: d * DAY_WIDTH }}>
                  <span className="text-[9px] text-muted-foreground pl-1">
                    {format(addBusinessDays(projectStart, d), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
            <svg width={chartWidth} height={chartHeight} className="block">
              {milestones.map((d) => (
                <line key={d} x1={d * DAY_WIDTH} y1={0} x2={d * DAY_WIDTH} y2={chartHeight}
                  stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 3" />
              ))}
              {bars.map((bar, i) => {
                const x = bar.startDay * DAY_WIDTH + 2;
                const w = Math.max(bar.days * DAY_WIDTH - 4, 8);
                const y = i * (BAR_HEIGHT + ROW_GAP) + ROW_GAP / 2;
                const color = phaseColor(bar.index);
                const isActive = activePhase === bar.phase;
                const pct = bar.tasks.length ? bar.completed / bar.tasks.length : 0;
                return (
                  <g key={bar.phase} onClick={() => setActivePhase(bar.phase)} className="cursor-pointer">
                    {/* Background bar */}
                    <rect x={x} y={y} width={w} height={BAR_HEIGHT} rx={10}
                      fill={color.bar} opacity={isActive ? 0.35 : 0.22}
                      className="transition-opacity duration-150" />
                    {/* Progress fill */}
                    {pct > 0 && (
                      <rect x={x} y={y} width={Math.max(w * pct, 2)} height={BAR_HEIGHT} rx={10}
                        fill={color.bar} opacity={isActive ? 1 : 0.9} />
                    )}
                    {/* Outline on active */}
                    <rect x={x} y={y} width={w} height={BAR_HEIGHT} rx={10}
                      fill="none" stroke={color.bar} strokeWidth={isActive ? 2 : 1} opacity={isActive ? 1 : 0.6} />
                    {w > 60 && (
                      <text x={x + 10} y={y + BAR_HEIGHT / 2} dominantBaseline="central"
                        className="text-[11px] font-semibold pointer-events-none"
                        fill="hsl(var(--foreground))">
                        {bar.phase}
                      </text>
                    )}
                    {w > 110 && (
                      <text x={x + w - 10} y={y + BAR_HEIGHT / 2} textAnchor="end" dominantBaseline="central"
                        className="text-[10px] pointer-events-none"
                        fill="hsl(var(--foreground))" opacity={0.7}>
                        {bar.completed}/{bar.tasks.length} · {bar.days}d
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
        {bars.map((bar) => {
          const color = phaseColor(bar.index);
          return (
            <button
              key={bar.phase}
              type="button"
              onClick={() => setActivePhase(bar.phase)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors text-muted-foreground"
            >
              <span className="inline-block h-2.5 w-3 rounded" style={{ background: color.bar }} />
              <span>{bar.phase}</span>
            </button>
          );
        })}
      </div>

      {/* Phase task detail panel */}
      {activeBar && (
        <div
          className="rounded-xl border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200"
          style={{ borderColor: phaseColor(activeBar.index).bar + "55" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: phaseColor(activeBar.index).bar }}
              />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{activeBar.phase} Phase</h3>
                <p className="text-[11px] text-muted-foreground">
                  {activeBar.tasks.length} task{activeBar.tasks.length === 1 ? "" : "s"} ·{" "}
                  {activeBar.completed} done · {activeBar.days} day{activeBar.days === 1 ? "" : "s"}
                  {!activeBar.hasExplicitDates && " (estimated)"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActivePhase(null)}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
              aria-label="Close phase details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {activeBar.tasks.map((t) => {
              const due = safeParse(t.dueDate);
              return (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  {t.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0 ml-[3px] mr-[3px]" />
                  )}
                  <span className={t.completed ? "line-through text-muted-foreground truncate" : "text-foreground truncate"}>
                    {t.title || "Untitled"}
                  </span>
                  {due && (
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {format(due, "MMM d")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground opacity-50">
        Phases sized by task dates · Falls back to estimates when dates are missing · Weekends excluded
      </p>
    </div>
  );
};

export default GanttTimeline;
