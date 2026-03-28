import { useMemo, useRef, useState } from "react";
import { Task } from "@/types/project";
import { estimateTaskDays } from "@/lib/estimateFinishDate";
import { format, addBusinessDays } from "date-fns";
import { CalendarRange, CheckCircle2 } from "lucide-react";

interface Props {
  tasks: Task[];
  startDate?: string;
}

interface GanttBar {
  id: string;
  title: string;
  days: number;
  startDay: number; // offset from project start in work days
  completed: boolean;
}

const COLORS = {
  completed: "hsl(var(--accent))",
  active: "hsl(var(--primary))",
  upcoming: "hsl(var(--muted-foreground) / 0.35)",
};

const GanttTimeline = ({ tasks, startDate }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { bars, totalDays, milestones } = useMemo(() => {
    if (tasks.length === 0) return { bars: [], totalDays: 0, milestones: [] };

    let offset = 0;
    const bars: GanttBar[] = tasks.map((t) => {
      const days = estimateTaskDays(t.title);
      const bar: GanttBar = {
        id: t.id,
        title: t.title,
        days,
        startDay: offset,
        completed: t.completed,
      };
      offset += days;
      return bar;
    });

    const totalDays = offset;

    // Generate week milestones
    const milestones: number[] = [];
    for (let d = 5; d < totalDays; d += 5) {
      milestones.push(d);
    }

    return { bars, totalDays, milestones };
  }, [tasks]);

  const projectStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate) {
      const sd = new Date(startDate);
      if (!isNaN(sd.getTime()) && sd > today) return sd;
    }
    return today;
  }, [startDate]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Timeline</h2>
        </div>
        <p className="text-sm text-muted-foreground">Add tasks to see the project timeline.</p>
      </div>
    );
  }

  const BAR_HEIGHT = 32;
  const ROW_GAP = 6;
  const LABEL_WIDTH = 120;
  const DAY_WIDTH = 28;
  const chartWidth = Math.max(totalDays * DAY_WIDTH, 200);
  const chartHeight = bars.length * (BAR_HEIGHT + ROW_GAP) + ROW_GAP;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">Timeline</h2>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: COLORS.completed }} />
          Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: COLORS.active }} />
          Remaining
        </span>
      </div>

      {/* Gantt scroll container */}
      <div className="flex overflow-hidden rounded-lg border bg-background">
        {/* Fixed labels */}
        <div className="shrink-0 border-r bg-secondary/50" style={{ width: LABEL_WIDTH }}>
          <div className="h-7 border-b flex items-center px-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Task</span>
          </div>
          {bars.map((bar, i) => (
            <div
              key={bar.id}
              className="flex items-center gap-1.5 px-2 transition-colors"
              style={{ height: BAR_HEIGHT + ROW_GAP }}
              onMouseEnter={() => setHoveredId(bar.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {bar.completed && <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />}
              <span
                className={`text-xs truncate ${
                  bar.completed ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {bar.title}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable chart */}
        <div className="overflow-x-auto flex-1" ref={scrollRef}>
          <div style={{ width: chartWidth, minWidth: "100%" }}>
            {/* Day header */}
            <div className="h-7 border-b flex items-end relative">
              {milestones.map((d) => (
                <div
                  key={d}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: d * DAY_WIDTH }}
                >
                  <span className="text-[9px] text-muted-foreground pl-1">
                    {format(addBusinessDays(projectStart, d), "MMM d")}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars */}
            <svg width={chartWidth} height={chartHeight} className="block">
              {/* Week grid lines */}
              {milestones.map((d) => (
                <line
                  key={d}
                  x1={d * DAY_WIDTH}
                  y1={0}
                  x2={d * DAY_WIDTH}
                  y2={chartHeight}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ))}

              {bars.map((bar, i) => {
                const x = bar.startDay * DAY_WIDTH + 2;
                const w = Math.max(bar.days * DAY_WIDTH - 4, 8);
                const y = i * (BAR_HEIGHT + ROW_GAP) + ROW_GAP / 2;
                const isHovered = hoveredId === bar.id;
                const fill = bar.completed ? COLORS.completed : COLORS.active;

                return (
                  <g
                    key={bar.id}
                    onMouseEnter={() => setHoveredId(bar.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={BAR_HEIGHT}
                      rx={6}
                      fill={fill}
                      opacity={isHovered ? 1 : 0.85}
                      className="transition-opacity duration-150"
                    />
                    {/* Duration label inside bar */}
                    {w > 30 && (
                      <text
                        x={x + w / 2}
                        y={y + BAR_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[10px] font-medium fill-primary-foreground pointer-events-none"
                      >
                        {bar.days}d
                      </text>
                    )}

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={x + w / 2 - 60}
                          y={y - 28}
                          width={120}
                          height={22}
                          rx={4}
                          fill="hsl(var(--foreground))"
                          opacity={0.9}
                        />
                        <text
                          x={x + w / 2}
                          y={y - 17}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[10px] fill-background pointer-events-none"
                        >
                          {format(addBusinessDays(projectStart, bar.startDay), "MMM d")} –{" "}
                          {format(addBusinessDays(projectStart, bar.startDay + bar.days), "MMM d")}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Durations based on industry averages · Weekends excluded · Hover bars for dates
      </p>
    </div>
  );
};

export default GanttTimeline;
