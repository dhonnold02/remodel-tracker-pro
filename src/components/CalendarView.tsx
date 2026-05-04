import { uuidv4 } from "@/lib/uuid";
import { useMemo, useState } from "react";
import { Task, ProjectEvent, ProjectEventType } from "@/hooks/useProjects";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseISO, format, isValid } from "date-fns";
import { CalendarDays, CheckCircle2, Plus, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { phaseColor } from "@/lib/phaseColors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  tasks: Task[];
  projectName?: string;
  projectId?: string;
  phases?: string[];
  events?: ProjectEvent[];
  onEventsChange?: (events: ProjectEvent[]) => void;
  canEdit?: boolean;
}

interface DayPhaseEntry {
  phase: string;
  index: number;
  tasks: Task[];
}

const EVENT_TYPES: { value: ProjectEventType; label: string; color: string }[] = [
  { value: "inspection", label: "Inspection", color: "hsl(0 72% 55%)" },
  { value: "walkthrough", label: "Walkthrough", color: "hsl(217 91% 60%)" },
  { value: "delivery", label: "Delivery", color: "hsl(38 92% 55%)" },
  { value: "meeting", label: "Meeting", color: "hsl(142 71% 45%)" },
  { value: "milestone", label: "Milestone", color: "hsl(270 70% 60%)" },
  { value: "other", label: "Other", color: "hsl(220 9% 55%)" },
];

const eventColor = (type: ProjectEventType) =>
  EVENT_TYPES.find((t) => t.value === type)?.color || EVENT_TYPES[5].color;
const eventLabel = (type: ProjectEventType) =>
  EVENT_TYPES.find((t) => t.value === type)?.label || "Other";

const safeParse = (d?: string | null): Date | null => {
  if (!d) return null;
  try {
    const p = parseISO(d);
    return isValid(p) ? p : null;
  } catch {
    return null;
  }
};

const CalendarView = ({ tasks, phases, events = [], onEventsChange, canEdit = false, projectId }: Props) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ProjectEventType>("inspection");
  const [newTime, setNewTime] = useState("");

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

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ProjectEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

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

  const selectedEvents: ProjectEvent[] = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

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

    // Mark dates that have events with a small underline-style indicator
    const eventDates: Date[] = [];
    for (const dateStr of eventsByDate.keys()) {
      const d = safeParse(dateStr);
      if (d) eventDates.push(d);
    }
    if (eventDates.length > 0) {
      mods.has_event = eventDates;
      styles.has_event = {
        position: "relative",
        boxShadow: "inset 0 -2px 0 0 hsl(var(--primary))",
      };
    }

    return { modifiers: mods, modifiersStyles: styles };
  }, [dateMap, phaseOrder, eventsByDate]);

  const isEmpty = dateMap.size === 0 && events.length === 0;

  // Active phases (those with at least one dated task) — for legend
  const activePhases = phaseOrder
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => {
      for (const phaseMap of dateMap.values()) if (phaseMap.has(p)) return true;
      return false;
    });

  const resetForm = () => {
    setNewTitle("");
    setNewType("inspection");
    setNewTime("");
    setShowForm(false);
  };

  const handleSaveEvent = () => {
    if (!selectedDate || !newTitle.trim() || !onEventsChange) return;
    const evt: ProjectEvent = {
      id: uuidv4(),
      title: newTitle.trim(),
      type: newType,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: newTime.trim() || null,
    };
    onEventsChange([...events, evt]);
    void scheduleNotification(evt);
    resetForm();
  };

  const handleDeleteEvent = (id: string) => {
    if (!onEventsChange) return;
    onEventsChange(events.filter((e) => e.id !== id));
    void deleteNotification(id);
  };

  const parseEventDateTime = (dateStr: string, time?: string | null): Date | null => {
    if (!dateStr) return null;
    let iso = dateStr;
    if (time && time.trim()) {
      // Try to parse times like "9:00 AM" or "14:30"
      const t = time.trim();
      const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (m) {
        let h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const ampm = m[3]?.toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        iso = `${dateStr}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
      }
    } else {
      iso = `${dateStr}T09:00:00`;
    }
    const d = new Date(iso);
    return isValid(d) ? d : null;
  };

  const scheduleNotification = async (evt: ProjectEvent) => {
    if (!user || !projectId) return;
    try {
      const { data: settings } = await supabase
        .from("company_settings")
        .select("notify_calendar_events")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!settings || !(settings as any).notify_calendar_events) return;

      const eventDate = parseEventDateTime(evt.date, evt.time);
      if (!eventDate) return;
      const notifyAt = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);

      await supabase.from("scheduled_notifications").insert({
        user_id: user.id,
        project_id: projectId,
        event_id: evt.id,
        event_title: evt.title,
        event_type: evt.type,
        event_date: eventDate.toISOString(),
        notify_at: notifyAt.toISOString(),
      } as any);
    } catch {
      // best-effort; don't block UX
    }
  };

  const deleteNotification = async (eventId: string) => {
    if (!user) return;
    try {
      await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);
    } catch {
      // best-effort
    }
  };

  return (
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="section-title">Phase Calendar</h2>
        </div>
        <span className="text-xs text-muted-foreground">Click a date to view or add events</span>
      </div>

      {/* Phase legend */}
      {activePhases.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
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
      )}

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
          {selectedDate && selectedEntries.length === 0 && selectedEvents.length === 0 && !showForm && (
            <p className="text-xs text-muted-foreground">No phase activity on this date.</p>
          )}

          {/* Events for this date */}
          {selectedEvents.map((evt) => {
            const color = eventColor(evt.type);
            return (
              <div
                key={evt.id}
                className="rounded-xl border bg-background p-3 flex items-center gap-3 transition-shadow duration-150 hover:shadow-sm"
                style={{ borderColor: color + "55" }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ background: color + "22", color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {eventLabel(evt.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{evt.title}</p>
                  {evt.time && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {evt.time}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Phase task entries */}
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

          {/* Add Event button + inline form */}
          {selectedDate && canEdit && (
            <>
              {!showForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="rounded-xl gap-1.5 mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Event
                </Button>
              ) : (
                <div className="rounded-xl border bg-background p-3 space-y-3 mt-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. City inspection, Owner walkthrough, Delivery..."
                    className="rounded-xl"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: eventColor(newType) }}
                    />
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as ProjectEventType)}
                      className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 9:00 AM (optional)"
                    className="rounded-xl"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={resetForm} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEvent}
                      disabled={!newTitle.trim()}
                      className="rounded-xl"
                    >
                      Save Event
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isEmpty && !selectedDate && (
            <p className="text-sm text-muted-foreground">
              Add due dates to tasks or click a date to add an event.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
