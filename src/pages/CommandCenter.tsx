import { useEffect, useMemo, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import SkeletonCard from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Cloud, CloudRain, CloudSnow, Sun, CloudLightning, CloudFog,
  ChevronDown, Loader2, FileDown, CalendarClock, ListTodo, Users,
  ClipboardList, Wind, Thermometer, Plus, X,
  CalendarX, CheckSquare, Flag, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO, startOfWeek, differenceInCalendarDays } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const EVENT_COLORS: Record<string, string> = {
  inspection: "hsl(0 72% 55%)",
  walkthrough: "hsl(217 91% 60%)",
  delivery: "hsl(38 92% 55%)",
  meeting: "hsl(142 71% 45%)",
  milestone: "hsl(270 70% 60%)",
  other: "hsl(220 9% 55%)",
};
const EVENT_LABELS: Record<string, string> = {
  inspection: "Inspection",
  walkthrough: "Walkthrough",
  delivery: "Delivery",
  meeting: "Meeting",
  milestone: "Milestone",
  other: "Other",
};

// Open-Meteo WMO weather codes → label + icon
const wmoToInfo = (code: number): { label: string; Icon: React.ComponentType<any> } => {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code <= 3) return { label: "Partly cloudy", Icon: Cloud };
  if (code <= 48) return { label: "Foggy", Icon: CloudFog };
  if (code <= 67) return { label: "Rainy", Icon: CloudRain };
  if (code <= 77) return { label: "Snowy", Icon: CloudSnow };
  if (code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code <= 86) return { label: "Snow showers", Icon: CloudSnow };
  return { label: "Thunderstorm", Icon: CloudLightning };
};

// ─────────────────────────────────────────────────────────────────────────────
// Geocode + Weather
// ─────────────────────────────────────────────────────────────────────────────
interface WeatherData {
  current: { temp: number; code: number; wind: number };
  daily: { date: string; max: number; min: number; code: number }[];
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || !GOOGLE_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc) return { lat: loc.lat, lng: loc.lng };
  } catch { /* ignore */ }
  return null;
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=7`;
    const res = await fetch(url);
    const d = await res.json();
    return {
      current: {
        temp: Math.round(d.current.temperature_2m),
        code: d.current.weather_code,
        wind: Math.round(d.current.wind_speed_10m),
      },
      daily: d.daily.time.map((t: string, i: number) => ({
        date: t,
        max: Math.round(d.daily.temperature_2m_max[i]),
        min: Math.round(d.daily.temperature_2m_min[i]),
        code: d.daily.weather_code[i],
      })),
    };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper (collapsible on mobile)
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({
  title, icon: Icon, children, defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 p-4 md:p-5 md:cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="font-heading text-base md:text-lg font-semibold text-foreground">
                {title}
              </h2>
            </div>
            <ChevronDown
              className={`md:hidden h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 md:px-5 pb-5">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CommandCenter Page
// ─────────────────────────────────────────────────────────────────────────────
const todayISO = () => format(new Date(), "yyyy-MM-dd");

interface CrewMember {
  id: string;        // crew_members.id
  name: string;
}

interface DispatchRow {
  id: string;
  member_id: string;
  project_id: string | null;
  dispatch_date: string;
}

interface DailyLogRow {
  id: string;
  project_id: string;
  log_date: string;
  notes: string;
  created_at: string;
  created_by: string;
}

interface EventRow {
  id: string;
  project_id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
}

const CommandCenter = () => {
  const { user } = useAuth();
  const { companyId, loading: roleLoading } = useRole();
  const { projects } = useProjects();

  // Company info (logo, name, address) for header + PDF
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Crew + dispatch + logs
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [dispatch, setDispatch] = useState<DispatchRow[]>([]);
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [weekEventRows, setWeekEventRows] = useState<EventRow[]>([]);

  // Add crew member UI
  const [addingCrew, setAddingCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [savingCrew, setSavingCrew] = useState(false);

  // Daily log form
  const [logProjectId, setLogProjectId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(todayISO());
  const [logNotes, setLogNotes] = useState<string>("");
  const [savingLog, setSavingLog] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(10);

  // Today / week boundaries
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const todayKey = format(today, "yyyy-MM-dd");

  // ── Load company settings ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("company_name, address, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setCompanyName(data.company_name || "");
      setCompanyAddress(data.address || "");
      setCompanyLogo(data.logo_url || null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Load weather (geocode → forecast) ────────────────────────────────────
  useEffect(() => {
    if (!companyAddress) return;
    let cancelled = false;
    setWeatherLoading(true);
    (async () => {
      const coords = await geocodeAddress(companyAddress);
      if (!coords || cancelled) { setWeatherLoading(false); return; }
      const w = await fetchWeather(coords.lat, coords.lng);
      if (cancelled) return;
      setWeather(w);
      setWeatherLoading(false);
    })();
    return () => { cancelled = true; };
  }, [companyAddress]);

  // ── Load crew + dispatch + daily logs ────────────────────────────────────
  const loadCompanyData = useCallback(async () => {
    if (!companyId) return;
    // crew (persistent roster — carries across weeks automatically)
    const { data: members } = await supabase
      .from("crew_members" as any)
      .select("id, name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    setCrew(((members as any[]) || []).map((m) => ({
      id: m.id,
      name: m.name || "Unnamed",
    })));

    // dispatch this week
    const weekEnd = format(addDays(weekStart, 6), "yyyy-MM-dd");
    const { data: disp } = await supabase
      .from("crew_dispatch")
      .select("id, member_id, project_id, dispatch_date")
      .eq("company_id", companyId)
      .gte("dispatch_date", format(weekStart, "yyyy-MM-dd"))
      .lte("dispatch_date", weekEnd);
    setDispatch((disp || []) as DispatchRow[]);

    // logs
    const { data: logRows } = await supabase
      .from("daily_logs")
      .select("id, project_id, log_date, notes, created_at, created_by")
      .eq("company_id", companyId)
      .order("log_date", { ascending: false })
      .limit(50);
    setLogs((logRows || []) as DailyLogRow[]);

    // calendar events for the week — query project_events directly
    // across every project the user can access (same source as Phase Calendar)
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length) {
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const { data: evRows } = await supabase
        .from("project_events")
        .select("id, project_id, title, type, date, time")
        .in("project_id", projectIds)
        .gte("date", weekStartStr)
        .lte("date", weekEnd)
        .order("date", { ascending: true });
      setWeekEventRows((evRows || []) as EventRow[]);
    } else {
      setWeekEventRows([]);
    }
  }, [companyId, weekStart, projects]);

  useEffect(() => { loadCompanyData(); }, [loadCompanyData]);

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Unknown";

  // ── Add / remove crew members ────────────────────────────────────────────
  const handleAddCrew = async () => {
    if (!user || !companyId) return;
    const name = newCrewName.trim();
    if (!name) { toast.error("Enter a name"); return; }
    setSavingCrew(true);
    const { error } = await supabase.from("crew_members" as any).insert({
      company_id: companyId,
      created_by: user.id,
      name,
    } as any);
    setSavingCrew(false);
    if (error) { toast.error("Failed to add crew member"); return; }
    toast.success("Crew member added");
    setNewCrewName("");
    setAddingCrew(false);
    loadCompanyData();
  };

  const handleRemoveCrew = async (memberId: string) => {
    const { error } = await supabase.from("crew_members" as any).delete().eq("id", memberId);
    if (error) { toast.error("Failed to remove crew member"); return; }
    // also clear any dispatch rows for this member
    await supabase.from("crew_dispatch").delete().eq("member_id", memberId);
    toast.success("Crew member removed");
    loadCompanyData();
  };

  // ── Today events ─────────────────────────────────────────────────────────
  const todayEvents = useMemo(() => {
    const out: { project: string; title: string; type: string; time: string | null }[] = [];
    for (const e of weekEventRows) {
      if (e.date === todayKey) out.push({
        project: projectName(e.project_id),
        title: e.title,
        type: e.type,
        time: e.time || null,
      });
    }
    out.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    return out;
  }, [weekEventRows, todayKey, projects]);

  const weekEvents = useMemo(() => {
    const out: { date: string; project: string; title: string; type: string; time: string | null }[] = [];
    for (const e of weekEventRows) {
      out.push({
        date: e.date,
        project: projectName(e.project_id),
        title: e.title,
        type: e.type,
        time: e.time || null,
      });
    }
    out.sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
    return out;
  }, [weekEventRows, projects]);

  // ── Tasks due today (grouped by project) ─────────────────────────────────
  const tasksDueToday = useMemo(() => {
    const grouped: { project: string; tasks: { title: string; phase: string }[] }[] = [];
    for (const p of projects) {
      const due = p.tasks.filter((t) => t.dueDate === todayKey && !t.completed);
      if (due.length) grouped.push({
        project: p.name,
        tasks: due.map((t) => ({ title: t.title, phase: t.phase || "General" })),
      });
    }
    return grouped;
  }, [projects, todayKey]);

  // ── Upcoming deadlines (next 14 days) ────────────────────────────────────
  const deadlines = useMemo(() => {
    const out: { project: string; label: string; date: string; days: number }[] = [];
    for (const p of projects) {
      if (!p.endDate) continue;
      try {
        const d = parseISO(p.endDate);
        const days = differenceInCalendarDays(d, today);
        if (days >= 0 && days <= 14) {
          out.push({ project: p.name, label: "Target finish", date: p.endDate, days });
        }
      } catch { /* ignore */ }
    }
    out.sort((a, b) => a.days - b.days);
    return out;
  }, [projects, today]);

  // ── Crew dispatch grid helpers ───────────────────────────────────────────
  const dispatchKey = (memberId: string, date: Date) =>
    `${memberId}::${format(date, "yyyy-MM-dd")}`;
  const dispatchMap = useMemo(() => {
    const m = new Map<string, DispatchRow>();
    for (const d of dispatch) m.set(`${d.member_id}::${d.dispatch_date}`, d);
    return m;
  }, [dispatch]);

  const setAssignment = async (member: CrewMember, date: Date, projectId: string) => {
    if (!user || !companyId) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = dispatchMap.get(`${member.id}::${dateStr}`);
    const realProjectId = projectId === "__none__" ? null : projectId;

    if (existing) {
      if (realProjectId === null) {
        const { error } = await supabase.from("crew_dispatch").delete().eq("id", existing.id);
        if (error) { toast.error("Failed to update assignment"); return; }
      } else {
        const { error } = await supabase.from("crew_dispatch")
          .update({ project_id: realProjectId }).eq("id", existing.id);
        if (error) { toast.error("Failed to update assignment"); return; }
      }
    } else if (realProjectId !== null) {
      const { error } = await supabase.from("crew_dispatch").insert({
        user_id: user.id,
        company_id: companyId,
        member_id: member.id,
        project_id: realProjectId,
        dispatch_date: dateStr,
      });
      if (error) { toast.error("Failed to save assignment"); return; }
    }
    loadCompanyData();
  };

  // ── Save daily log ───────────────────────────────────────────────────────
  const handleSaveLog = async () => {
    if (!user || !companyId) return;
    if (!logProjectId) { toast.error("Pick a project"); return; }
    if (!logNotes.trim()) { toast.error("Add some notes"); return; }
    setSavingLog(true);
    const { error } = await supabase.from("daily_logs").insert({
      company_id: companyId,
      project_id: logProjectId,
      log_date: logDate,
      notes: logNotes.trim(),
      created_by: user.id,
    });
    setSavingLog(false);
    if (error) { toast.error("Failed to save log"); return; }
    toast.success("Daily log saved");
    setLogNotes("");
    loadCompanyData();
  };

  // (projectName moved earlier in the component)

  // ── Print Export (browser print-to-PDF, Safari-friendly) ────────────────
  const handleExportPrint = useCallback(() => {
    const range = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(addDays(weekStart, 6), "yyyy-MM-dd");

    // Read brand color from CSS variable --primary (HSL components, e.g. "217 91% 60%")
    const primaryRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary").trim();
    const brand = primaryRaw ? `hsl(${primaryRaw})` : "#3b82f6";
    const brandSoft = primaryRaw ? `hsl(${primaryRaw} / 0.10)` : "#eff6ff";

    const esc = (s: string) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      }[c] as string));

    // Events grouped by day
    const eventsByDay = weekDays.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      return {
        label: format(d, "EEEE, MMM d"),
        rows: weekEvents.filter((e) => e.date === ds),
      };
    }).filter((d) => d.rows.length > 0);
    const eventsHtml = eventsByDay.length === 0
      ? `<p class="empty">No events this week.</p>`
      : eventsByDay.map((day) => `<h3>${esc(day.label)}</h3><table><thead><tr><th style="width:70px">Time</th><th>Event</th><th>Project</th><th style="text-align:right">Type</th></tr></thead><tbody>${
          day.rows.map((e) => `<tr><td>${esc(e.time || "—")}</td><td>${esc(e.title)}</td><td class="muted">${esc(e.project)}</td><td style="text-align:right"><span class="badge">${esc(EVENT_LABELS[e.type] || "Other")}</span></td></tr>`).join("")
        }</tbody></table>`).join("");

    // Tasks grouped by project
    const tasksByProject: { project: string; tasks: { title: string; date: string; done: boolean }[] }[] = [];
    for (const p of projects) {
      const due = p.tasks.filter((t) => t.dueDate && t.dueDate >= start && t.dueDate <= end);
      if (due.length) {
        tasksByProject.push({
          project: p.name,
          tasks: due.map((t) => ({ title: t.title, date: t.dueDate as string, done: !!t.completed }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        });
      }
    }
    const tasksHtml = tasksByProject.length === 0
      ? `<p class="empty">No tasks due this week.</p>`
      : tasksByProject.map((g) => `<h3>${esc(g.project)}</h3><table><thead><tr><th>Task</th><th style="text-align:right">Due</th></tr></thead><tbody>${
          g.tasks.map((t) => `<tr><td>${t.done ? "✓" : "○"} ${esc(t.title)}</td><td style="text-align:right" class="muted">${esc(format(parseISO(t.date), "EEE MMM d"))}</td></tr>`).join("")
        }</tbody></table>`).join("");

    // Dispatch
    const dispatchByDay = weekDays.map((d) => ({
      label: format(d, "EEEE, MMM d"),
      rows: crew.map((c) => {
        const row = dispatchMap.get(`${c.id}::${format(d, "yyyy-MM-dd")}`);
        return { member: c.name, project: row?.project_id ? projectName(row.project_id) : "—" };
      }),
    }));
    const dispatchHtml = crew.length === 0
      ? `<p class="empty">No crew members.</p>`
      : `<table><thead><tr><th style="width:40%">Crew Member</th><th>Project</th></tr></thead></table>` +
        dispatchByDay.map((d) => `<h3>${esc(d.label)}</h3><table><tbody>${
          d.rows.map((r) => `<tr><td style="width:40%">${esc(r.member)}</td><td class="${r.project === "—" ? "muted" : ""}">${esc(r.project)}</td></tr>`).join("")
        }</tbody></table>`).join("");

    // Logs
    const weekLogs = logs.filter((l) => l.log_date >= start && l.log_date <= end);
    const logsHtml = weekLogs.length === 0
      ? `<p class="empty">No logs this week.</p>`
      : weekLogs.map((l) => `<div class="log"><div class="logmeta">${esc(format(parseISO(l.log_date), "EEEE, MMM d"))} · ${esc(projectName(l.project_id))}</div><div class="lognotes">${esc(l.notes)}</div></div>`).join("");

    const safeName = (companyName || "Company").replace(/[^a-z0-9]+/gi, "-");
    const docTitle = `${safeName}-WeeklyReport-${format(weekStart, "yyyy-MM-dd")}`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif;
    color: #111827; background: #ffffff; margin: 40px;
    font-size: 12px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid ${brand};
    padding-bottom: 18px; margin-bottom: 32px;
  }
  .eyebrow {
    font-size: 10px; color: ${brand}; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;
  }
  h1 { font-size: 26px; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.3px; }
  .range { color: #6b7280; font-size: 13px; font-weight: 400; }
  .logo { max-height: 56px; max-width: 160px; object-fit: contain; }
  .companyRight { text-align: right; }
  .companyRight .name { font-weight: 700; font-size: 14px; color: #0f172a; }
  .companyRight .sub { color: #6b7280; font-size: 11px; margin-top: 2px; }

  h2 {
    font-size: 11px; color: #0f172a; letter-spacing: 1.8px;
    text-transform: uppercase; font-weight: 700;
    margin: 36px 0 14px 0; padding: 8px 12px;
    background: #f3f4f6; border-left: 3px solid ${brand};
  }
  h2:first-of-type { margin-top: 0; }

  h3 {
    font-size: 11px; color: ${brand}; font-weight: 700;
    letter-spacing: 0.5px; text-transform: uppercase;
    margin: 18px 0 6px 0; padding: 0;
  }

  table {
    width: 100%; border-collapse: collapse;
    margin-bottom: 4px;
  }
  th, td {
    text-align: left; padding: 9px 12px; font-size: 11px;
    border-bottom: 1px solid #f3f4f6;
  }
  th {
    color: #6b7280; text-transform: uppercase;
    font-size: 9px; font-weight: 700; letter-spacing: 1px;
    border-bottom: 1px solid #e5e7eb; background: #ffffff;
  }
  tbody tr:nth-child(odd) td { background: #ffffff; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  tbody tr:last-child td { border-bottom: 0; }

  .muted { color: #6b7280; }
  .badge {
    display: inline-block; font-size: 9px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase;
    color: ${brand}; background: ${brandSoft};
    padding: 3px 8px; border-radius: 4px;
  }
  .empty {
    color: #9ca3af; font-style: italic; padding: 14px;
    text-align: center; background: #fafafa; border-radius: 4px;
  }

  .log {
    border-left: 3px solid ${brand}; padding: 6px 0 6px 12px;
    margin-bottom: 14px;
  }
  .logmeta {
    font-weight: 700; color: #0f172a; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px;
  }
  .lognotes { color: #1f2937; white-space: pre-wrap; font-size: 11px; }

  footer {
    margin-top: 40px; padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af; font-size: 10px;
    display: flex; justify-content: space-between; align-items: center;
  }
  footer .center { flex: 1; text-align: center; }
  footer .right { text-align: right; }

  @media print { body { margin: 16mm; } h2 { page-break-after: avoid; } h3 { page-break-after: avoid; } .log, tr { page-break-inside: avoid; } }
</style></head><body>
<header>
  <div>
    <div class="eyebrow">Weekly Report</div>
    <h1>${esc(companyName || "Weekly Report")}</h1>
    <div class="range">${esc(range)}</div>
  </div>
  ${companyLogo
    ? `<img class="logo" src="${esc(companyLogo)}" alt="${esc(companyName)}" />`
    : `<div class="companyRight"><div class="name">${esc(companyName || "—")}</div><div class="sub">Licensed Contractor</div></div>`}
</header>

<h2>Calendar Events</h2>
${eventsHtml}

<h2>Tasks Due This Week</h2>
${tasksHtml}

<h2>Crew Dispatch</h2>
${dispatchHtml}

<h2>Daily Log</h2>
${logsHtml}

<footer>
  <span>${esc(companyName || "Sightline")}</span>
  <span class="center">Generated by Sightline</span>
  <span class="right">${esc(format(new Date(), "MMM d, yyyy"))}</span>
</footer>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error(
        "Pop-ups are blocked. Please allow pop-ups for this site in your browser settings, then try exporting again.",
        { duration: 8000 }
      );
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.document.title = docTitle;

    const triggerPrint = () => {
      try { w.focus(); w.print(); } catch { /* ignore */ }
    };
    // Wait for images (logo) to load before printing
    const imgs = Array.from(w.document.images || []);
    if (imgs.length === 0) {
      setTimeout(triggerPrint, 250);
    } else {
      let remaining = imgs.length;
      const done = () => { if (--remaining <= 0) setTimeout(triggerPrint, 100); };
      imgs.forEach((img) => {
        if (img.complete) done();
        else { img.addEventListener("load", done); img.addEventListener("error", done); }
      });
    }

    toast.success("Weekly Report ready", {
      description: `Choose "Save as PDF" in the print dialog to download.`,
    });
  }, [companyLogo, companyName, crew, dispatchMap, logs, projects, weather, weekDays, weekEvents, weekStart]);

  const renderExportButton = (className: string) => (
    <Button onClick={handleExportPrint} className={`rounded-xl ${className}`}>
      <FileDown className="h-4 w-4 mr-2" />
      Export Weekly Report
    </Button>
  );

  if (roleLoading) {
    return (
      <AppLayout title="Command Center" subtitle="Daily operations dashboard">
        <div className="max-w-6xl space-y-5 md:space-y-6 pb-8">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Command Center"
      subtitle="Daily operations dashboard"
      actions={renderExportButton("hidden md:inline-flex")}
    >
      <div className="max-w-6xl space-y-5 md:space-y-6 pb-8">
        {/* Mobile export button */}
        {renderExportButton("md:hidden w-full")}

        {/* Weather */}
        <Section title="Weather" icon={Cloud}>
          {!companyAddress ? (
            <p className="text-sm text-muted-foreground">
              Add your company address in Settings to see local weather.
            </p>
          ) : weatherLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading forecast…
            </div>
          ) : !weather ? (
            <p className="text-sm text-muted-foreground">Weather unavailable for this address.</p>
          ) : (
            <div className="space-y-4">
              {/* Today */}
              {(() => {
                const info = wmoToInfo(weather.current.code);
                return (
                  <div className="flex items-center gap-4 rounded-xl bg-secondary/40 p-4">
                    <info.Icon className="h-10 w-10 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3">
                        <span className="font-heading text-3xl font-bold text-foreground">
                          {weather.current.temp}°F
                        </span>
                        <span className="text-sm text-muted-foreground">{info.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Wind className="h-3 w-3" /> {weather.current.wind} mph wind
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* 7-day */}
              <div className="grid grid-cols-7 gap-2">
                {weather.daily.map((d) => {
                  const info = wmoToInfo(d.code);
                  return (
                    <div key={d.date} className="rounded-xl bg-secondary/30 p-2 text-center">
                      <div className="text-xs uppercase text-muted-foreground tracking-wide font-medium">
                        {format(parseISO(d.date), "EEE")}
                      </div>
                      <info.Icon className="h-5 w-5 mx-auto my-2 text-primary" />
                      <div className="text-xs font-semibold text-foreground">{d.max}°</div>
                      <div className="text-xs text-muted-foreground">{d.min}°</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* Today's Events */}
        <Section title="Today's Events" icon={CalendarClock}>
          {todayEvents.length === 0 ? (
            <EmptyState icon={CalendarX} title="No events scheduled today" />
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-secondary/30 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: EVENT_COLORS[e.type] || EVENT_COLORS.other }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {e.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{e.project}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {EVENT_LABELS[e.type] || "Other"}
                  </Badge>
                  {e.time && (
                    <span className="text-xs text-muted-foreground tabular-nums">{e.time}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Collapsible className="mt-4">
            <CollapsibleTrigger asChild>
              <button className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                Show full week <ChevronDown className="h-3 w-3" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              {weekEvents.length === 0 ? (
                <EmptyState icon={CalendarX} title="No events this week" />
              ) : (
                <ul className="space-y-1.5">
                  {weekEvents.map((e, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-xl bg-secondary/20">
                      <span className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: EVENT_COLORS[e.type] || EVENT_COLORS.other }} />
                      <span className="text-muted-foreground tabular-nums w-16 shrink-0">
                        {format(parseISO(e.date), "EEE MMM d")}
                      </span>
                      <span className="flex-1 truncate text-foreground">{e.title}</span>
                      <span className="text-muted-foreground truncate hidden sm:block">{e.project}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Section>

        {/* Tasks Due Today */}
        <Section title="Tasks Due Today" icon={ListTodo}>
          {tasksDueToday.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks due today" />
          ) : (
            <div className="space-y-4">
              {tasksDueToday.map((g, i) => (
                <div key={i}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {g.project}
                  </div>
                  <ul className="space-y-1.5">
                    {g.tasks.map((t, j) => (
                      <li key={j} className="flex items-center gap-3 rounded-xl bg-secondary/30 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{t.title}</span>
                        <Badge variant="outline" className="text-xs">{t.phase}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Upcoming Deadlines */}
        <Section title="Upcoming Deadlines" icon={Thermometer}>
          {deadlines.length === 0 ? (
            <EmptyState icon={Flag} title="No upcoming deadlines" description="No deadlines in the next 14 days." />
          ) : (
            <ul className="space-y-2">
              {deadlines.map((d, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-secondary/30 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.project}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.label} · {format(parseISO(d.date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={d.days <= 3 ? "text-destructive border-destructive/50" : ""}
                  >
                    {d.days === 0 ? "Today" : `${d.days}d`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Crew Dispatch */}
        <Section title="Crew Dispatch" icon={Users}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs text-muted-foreground">
              {crew.length === 0
                ? "Add crew members to start assigning them to projects."
                : `${crew.length} crew member${crew.length === 1 ? "" : "s"}`}
            </p>
            {!addingCrew && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingCrew(true)}
                className="rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Crew Member
              </Button>
            )}
          </div>
          {addingCrew && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-secondary/30 border border-border">
              <Input
                autoFocus
                value={newCrewName}
                onChange={(e) => setNewCrewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCrew(); }}
                placeholder="Crew member name"
                className="rounded-xl flex-1"
              />
              <Button size="sm" onClick={handleAddCrew} disabled={savingCrew} className="rounded-xl">
                {savingCrew ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingCrew(false); setNewCrewName(""); }}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          )}
          {crew.length === 0 ? null : (
            <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2 w-40">
                      Member
                    </th>
                    {weekDays.map((d) => (
                      <th key={d.toISOString()} className="text-xs font-semibold text-muted-foreground text-center px-1 py-2">
                        <div>{format(d, "EEE")}</div>
                        <div className="text-xs font-normal">{format(d, "MMM d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crew.map((m) => (
                    <tr key={m.id}>
                      <td className="px-2 py-1 text-sm font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate flex-1">{m.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCrew(m.id)}
                            className="h-5 w-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label={`Remove ${m.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      {weekDays.map((d) => {
                        const row = dispatchMap.get(dispatchKey(m.id, d));
                        return (
                          <td key={d.toISOString()} className="px-1 py-1">
                            <Select
                              value={row?.project_id || "__none__"}
                              onValueChange={(v) => setAssignment(m, d, v)}
                            >
                              <SelectTrigger className="h-9 text-xs rounded-xl bg-secondary/40 border-border">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Unassigned —</SelectItem>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards (collapsible per member) */}
            <div className="md:hidden space-y-3">
              {crew.map((m) => {
                const assignedCount = weekDays.reduce(
                  (acc, d) => acc + (dispatchMap.get(dispatchKey(m.id, d))?.project_id ? 1 : 0),
                  0,
                );
                return (
                  <Collapsible key={m.id}>
                    <div className="rounded-xl border bg-card/60">
                      <div className="flex items-center justify-between gap-2 p-3">
                        <CollapsibleTrigger asChild>
                          <button className="group flex items-center gap-2 flex-1 min-w-0 text-left focus-visible:outline-none">
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                            <span className="text-sm font-semibold text-foreground truncate flex-1">{m.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {assignedCount}/{weekDays.length} days
                            </span>
                          </button>
                        </CollapsibleTrigger>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrew(m.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          aria-label={`Remove ${m.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <CollapsibleContent>
                        <ul className="space-y-1.5 px-3 pb-3">
                          {weekDays.map((d) => {
                            const row = dispatchMap.get(dispatchKey(m.id, d));
                            return (
                              <li key={d.toISOString()} className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                                  {format(d, "EEE MMM d")}
                                </span>
                                <Select
                                  value={row?.project_id || "__none__"}
                                  onValueChange={(v) => setAssignment(m, d, v)}
                                >
                                  <SelectTrigger className="h-9 text-xs rounded-xl bg-secondary/40 border-border flex-1">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                                    {projects.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </li>
                            );
                          })}
                        </ul>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
            </>
          )}
        </Section>

        {/* Daily Log */}
        <Section title="Daily Log" icon={ClipboardList}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select value={logProjectId} onValueChange={setLogProjectId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Textarea
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              placeholder="What was completed today?"
              rows={4}
              className="rounded-xl"
            />
            <Button
              onClick={handleSaveLog}
              disabled={savingLog || !logProjectId || !logNotes.trim()}
              className="w-full md:w-auto rounded-xl"
            >
              {savingLog ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Log
            </Button>
          </div>

          {/* Past entries */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Past Entries
            </h3>
            {logs.length === 0 ? (
              <EmptyState icon={BookOpen} title="No log entries yet" description="Save your first daily log above." />
            ) : (
              <>
              <ul className="space-y-2">
                {logs.slice(0, visibleLogCount).map((l) => (
                  <li key={l.id} className="rounded-xl bg-secondary/30 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {projectName(l.project_id)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(parseISO(l.log_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{l.notes}</p>
                  </li>
                ))}
              </ul>
              {logs.length > visibleLogCount && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {Math.min(visibleLogCount, logs.length)} of {logs.length} entries
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setVisibleLogCount((c) => c + 10)}
                  >
                    Load more
                  </Button>
                </div>
              )}
              </>
            )}
          </div>
        </Section>
      </div>
    </AppLayout>
  );
};

export default CommandCenter;
