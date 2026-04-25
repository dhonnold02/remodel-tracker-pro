import { Task } from "@/hooks/useProjects";
import { differenceInBusinessDays, parseISO, isValid } from "date-fns";

/**
 * Estimated days per task based on industry averages for home renovation.
 * Sources: HomeImperfect, HouseRemodelCost, JSBrown Company (2024-2026).
 *
 * Keyword matching assigns a realistic duration; unmatched tasks default
 * to 2 days (a typical minor renovation task).
 */
const TASK_DURATION_MAP: { keywords: string[]; days: number }[] = [
  // Structural / heavy
  { keywords: ["demolition", "demo", "tear out", "tear down", "gut"], days: 3 },
  { keywords: ["foundation", "structural", "load-bearing", "beam"], days: 7 },
  { keywords: ["framing", "frame", "wall framing"], days: 5 },
  { keywords: ["roof", "roofing", "shingles"], days: 5 },
  { keywords: ["window", "windows"], days: 3 },
  { keywords: ["door", "doors"], days: 2 },
  { keywords: ["drywall", "sheetrock"], days: 4 },
  { keywords: ["insulation", "insulate"], days: 2 },

  // Systems
  { keywords: ["electrical", "wiring", "rewire", "outlets", "panel"], days: 5 },
  { keywords: ["plumbing", "pipes", "repipe", "drain"], days: 5 },
  { keywords: ["hvac", "heating", "cooling", "ductwork", "furnace"], days: 4 },

  // Finishes
  { keywords: ["paint", "painting", "prime", "primer"], days: 3 },
  { keywords: ["tile", "tiling", "backsplash", "grout"], days: 4 },
  { keywords: ["flooring", "floor", "hardwood", "laminate", "vinyl", "carpet"], days: 4 },
  { keywords: ["cabinet", "cabinets"], days: 3 },
  { keywords: ["countertop", "counter", "granite", "quartz", "marble"], days: 2 },
  { keywords: ["trim", "molding", "baseboard", "crown"], days: 2 },

  // Fixtures & appliances
  { keywords: ["fixture", "faucet", "sink", "toilet", "shower", "tub", "bathtub"], days: 2 },
  { keywords: ["appliance", "dishwasher", "oven", "range", "refrigerator"], days: 1 },
  { keywords: ["lighting", "light", "chandelier", "recessed"], days: 2 },

  // Exterior
  { keywords: ["siding", "exterior"], days: 5 },
  { keywords: ["deck", "patio", "porch"], days: 5 },
  { keywords: ["landscaping", "landscape", "yard"], days: 3 },
  { keywords: ["fence", "fencing", "gate"], days: 3 },
  { keywords: ["concrete", "driveway", "walkway"], days: 3 },

  // Rooms (broader estimates)
  { keywords: ["kitchen"], days: 5 },
  { keywords: ["bathroom", "bath"], days: 4 },
  { keywords: ["bedroom"], days: 3 },
  { keywords: ["basement"], days: 7 },
  { keywords: ["garage"], days: 4 },

  // Misc
  { keywords: ["permit", "inspection", "code"], days: 3 },
  { keywords: ["cleanup", "clean", "haul", "disposal"], days: 1 },
  { keywords: ["design", "plan", "measure"], days: 2 },
  { keywords: ["order", "delivery", "materials", "supplies"], days: 3 },
];

const DEFAULT_DAYS_PER_TASK = 2;

/** Estimate days for a single task title using keyword matching. */
export function estimateTaskDays(title: string): number {
  const lower = title.toLowerCase();
  for (const entry of TASK_DURATION_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.days;
    }
  }
  return DEFAULT_DAYS_PER_TASK;
}

/** Estimate days for a phase based on the number of tasks it contains. */
export function estimatePhaseDays(taskCount: number): number {
  if (taskCount <= 0) return 0;
  if (taskCount <= 2) return 2;
  if (taskCount <= 5) return 5;
  if (taskCount <= 10) return 10;
  return 15;
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

export interface PhaseBreakdown {
  phase: string;
  taskCount: number;
  days: number;
  fromDates: boolean;
  parallel: boolean;
}

/**
 * Calculate estimated finish date based on incomplete tasks.
 * - Sums estimated days for each remaining (incomplete) task.
 * - Starts from today or the project start date, whichever is later.
 * - Skips weekends (work days only).
 * - Returns null if no incomplete tasks remain.
 */
/** Phases treated as administrative catch-alls — excluded from sequential timeline. */
const PARALLEL_PHASES = new Set(["general", "misc", "other"]);
const isParallelPhase = (phase: string) => PARALLEL_PHASES.has(phase.trim().toLowerCase());

export function estimateFinishDate(
  tasks: Task[],
  startDate?: string
): { date: Date; totalWorkDays: number; phaseBreakdown: PhaseBreakdown[] } | null {
  // Only consider top-level, incomplete tasks
  const topTasks = tasks.filter((t) => !t.parentTaskId);
  const incomplete = topTasks.filter((t) => !t.completed);
  if (incomplete.length === 0) return null;

  // Group by phase, preserving first-seen order
  const phaseOrder: string[] = [];
  const grouped = new Map<string, Task[]>();
  for (const t of incomplete) {
    const p = t.phase || "General";
    if (!grouped.has(p)) {
      grouped.set(p, []);
      phaseOrder.push(p);
    }
    grouped.get(p)!.push(t);
  }

  const phaseBreakdown: PhaseBreakdown[] = phaseOrder.map((phase) => {
    const phaseTasks = grouped.get(phase)!;
    const parallel = isParallelPhase(phase);
    const dated = phaseTasks
      .map((t) => safeParse(t.dueDate))
      .filter((d): d is Date => !!d);

    if (dated.length > 0) {
      // Real dates win — measure span across earliest → latest due date
      const earliest = new Date(Math.min(...dated.map((d) => d.getTime())));
      const latest = new Date(Math.max(...dated.map((d) => d.getTime())));
      const days = Math.max(1, differenceInBusinessDays(latest, earliest) + 1);
      return { phase, taskCount: phaseTasks.length, days, fromDates: true, parallel };
    }

    return {
      phase,
      taskCount: phaseTasks.length,
      days: estimatePhaseDays(phaseTasks.length),
      fromDates: false,
      parallel,
    };
  });

  // Catch-all phases run in parallel and don't extend the sequential timeline
  const totalWorkDays = phaseBreakdown
    .filter((p) => !p.parallel)
    .reduce((sum, p) => sum + p.days, 0);

  // Start from today or project start date (whichever is later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from = today;
  if (startDate) {
    const sd = new Date(startDate);
    if (!isNaN(sd.getTime()) && sd > today) {
      from = sd;
    }
  }

  // Add work days (skip Sat/Sun)
  const finish = new Date(from);
  let added = 0;
  while (added < totalWorkDays) {
    finish.setDate(finish.getDate() + 1);
    const day = finish.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }

  return { date: finish, totalWorkDays, phaseBreakdown };
}
