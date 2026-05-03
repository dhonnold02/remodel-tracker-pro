import { useEffect, useMemo, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
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
  ClipboardList, Wind, Thermometer,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO, startOfWeek, differenceInCalendarDays } from "date-fns";
import {
  Document, Page, Text, View, StyleSheet, pdf, Image as PDFImage,
} from "@react-pdf/renderer";
const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
  "AIzaSyA_sOPvjxhs8rsD8-6DLsvXdHjpen4Mj7Q";

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
  id: string;        // company_members.id
  user_id: string;
  display_name: string;
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

  // Daily log form
  const [logProjectId, setLogProjectId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(todayISO());
  const [logNotes, setLogNotes] = useState<string>("");
  const [savingLog, setSavingLog] = useState(false);

  const [exporting, setExporting] = useState(false);

  // Today / week boundaries
  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
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
    // crew
    const { data: members } = await supabase
      .from("company_members")
      .select("id, user_id")
      .eq("company_id", companyId);
    const userIds = (members || []).map((m) => m.user_id);
    let profileMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, display_name").in("id", userIds);
      (profiles || []).forEach((p) =>
        profileMap.set(p.id, p.display_name || "Unnamed"));
    }
    setCrew((members || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      display_name: profileMap.get(m.user_id) || "Unnamed",
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
  }, [companyId, weekStart]);

  useEffect(() => { loadCompanyData(); }, [loadCompanyData]);

  // ── Today events ─────────────────────────────────────────────────────────
  const todayEvents = useMemo(() => {
    const out: { project: string; title: string; type: string; time: string | null }[] = [];
    for (const p of projects) {
      for (const e of p.events) {
        if (e.date === todayKey) out.push({
          project: p.name, title: e.title, type: e.type, time: e.time || null,
        });
      }
    }
    out.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    return out;
  }, [projects, todayKey]);

  const weekEvents = useMemo(() => {
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(addDays(weekStart, 6), "yyyy-MM-dd");
    const out: { date: string; project: string; title: string; type: string; time: string | null }[] = [];
    for (const p of projects) {
      for (const e of p.events) {
        if (e.date >= start && e.date <= end) out.push({
          date: e.date, project: p.name, title: e.title, type: e.type, time: e.time || null,
        });
      }
    }
    out.sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
    return out;
  }, [projects, weekStart]);

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

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Unknown";

  // ── PDF Export ───────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const range = `${format(weekStart, "MMM d")}–${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
      const tasksDoneThisWeek: { project: string; title: string }[] = [];
      // We'll approximate "completed this week" as completed tasks with dueDate within week.
      const start = format(weekStart, "yyyy-MM-dd");
      const end = format(addDays(weekStart, 6), "yyyy-MM-dd");
      for (const p of projects) {
        for (const t of p.tasks) {
          if (t.completed && t.dueDate && t.dueDate >= start && t.dueDate <= end) {
            tasksDoneThisWeek.push({ project: p.name, title: t.title });
          }
        }
      }
      const dispatchByDay = weekDays.map((d) => ({
        date: format(d, "EEE MMM d"),
        rows: crew.map((c) => {
          const row = dispatchMap.get(`${c.id}::${format(d, "yyyy-MM-dd")}`);
          return {
            member: c.display_name,
            project: row?.project_id ? projectName(row.project_id) : "—",
          };
        }),
      }));
      const weekLogs = logs.filter((l) => l.log_date >= start && l.log_date <= end);

      const blob = await pdf(
        <WeeklyReportDocument
          companyName={companyName}
          companyLogo={companyLogo}
          range={range}
          weather={weather}
          events={weekEvents}
          tasksDone={tasksDoneThisWeek}
          dispatchByDay={dispatchByDay}
          logs={weekLogs.map((l) => ({
            date: l.log_date,
            project: projectName(l.project_id),
            notes: l.notes,
          }))}
        />
      ).toBlob();

      const safeName = (companyName || "Company").replace(/[^a-z0-9]+/gi, "-");
      const filename = `${safeName}-WeeklyReport-${format(weekStart, "yyyy-MM-dd")}.pdf`;
      saveAs(blob, filename);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report");
    } finally {
      setExporting(false);
    }
  };

  if (roleLoading) {
    return (
      <AppLayout title="Command Center">
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Command Center"
      subtitle="Daily operations dashboard"
      actions={
        <Button
          onClick={handleExportPDF}
          disabled={exporting}
          className="rounded-xl hidden md:inline-flex"
        >
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Export Weekly Report
        </Button>
      }
    >
      <div className="max-w-6xl space-y-5 md:space-y-6 pb-8">
        {/* Mobile export button */}
        <Button
          onClick={handleExportPDF}
          disabled={exporting}
          className="md:hidden w-full rounded-xl"
        >
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Export Weekly Report
        </Button>

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
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wide font-medium">
                        {format(parseISO(d.date), "EEE")}
                      </div>
                      <info.Icon className="h-5 w-5 mx-auto my-2 text-primary" />
                      <div className="text-xs font-semibold text-foreground">{d.max}°</div>
                      <div className="text-[10px] text-muted-foreground">{d.min}°</div>
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
            <p className="text-sm text-muted-foreground">No events scheduled today.</p>
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
                  <Badge variant="outline" className="text-[10px]">
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
                <p className="text-xs text-muted-foreground">No events this week.</p>
              ) : (
                <ul className="space-y-1.5">
                  {weekEvents.map((e, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg bg-secondary/20">
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
            <p className="text-sm text-muted-foreground">No tasks due today.</p>
          ) : (
            <div className="space-y-4">
              {tasksDueToday.map((g, i) => (
                <div key={i}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {g.project}
                  </div>
                  <ul className="space-y-1.5">
                    {g.tasks.map((t, j) => (
                      <li key={j} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{t.title}</span>
                        <Badge variant="outline" className="text-[10px]">{t.phase}</Badge>
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
            <p className="text-sm text-muted-foreground">No deadlines in the next 14 days.</p>
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
          {crew.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Invite team members from the Team page to start assigning crew.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <table className="w-full text-sm border-separate border-spacing-1 min-w-[700px]">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2 w-32">
                      Member
                    </th>
                    {weekDays.map((d) => (
                      <th key={d.toISOString()} className="text-xs font-semibold text-muted-foreground text-center px-1 py-2">
                        <div>{format(d, "EEE")}</div>
                        <div className="text-[10px] font-normal">{format(d, "MMM d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crew.map((m) => (
                    <tr key={m.id}>
                      <td className="px-2 py-1 text-sm font-medium text-foreground truncate">
                        {m.display_name}
                      </td>
                      {weekDays.map((d) => {
                        const row = dispatchMap.get(dispatchKey(m.id, d));
                        return (
                          <td key={d.toISOString()} className="px-1 py-1">
                            <Select
                              value={row?.project_id || "__none__"}
                              onValueChange={(v) => setAssignment(m, d, v)}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg bg-secondary/40 border-border">
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
              disabled={savingLog}
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
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((l) => (
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
            )}
          </div>
        </Section>
      </div>
    </AppLayout>
  );
};

export default CommandCenter;

// ─────────────────────────────────────────────────────────────────────────────
// PDF Document
// ─────────────────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, borderBottom: "1pt solid #e5e7eb", paddingBottom: 12 },
  logo: { width: 48, height: 48, marginRight: 12, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: 700, color: "#111827" },
  range: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#111827", marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 90, color: "#6b7280" },
  value: { flex: 1, color: "#1f2937" },
  bullet: { marginBottom: 2, color: "#1f2937" },
  empty: { color: "#9ca3af", fontStyle: "italic" },
  dispatchDay: { marginBottom: 8 },
  dispatchDate: { fontWeight: 700, fontSize: 10, color: "#374151", marginBottom: 2 },
  logBlock: { marginBottom: 8, borderLeft: "2pt solid #3b82f6", paddingLeft: 8 },
  logMeta: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
});

interface WeeklyReportProps {
  companyName: string;
  companyLogo: string | null;
  range: string;
  weather: WeatherData | null;
  events: { date: string; project: string; title: string; type: string; time: string | null }[];
  tasksDone: { project: string; title: string }[];
  dispatchByDay: { date: string; rows: { member: string; project: string }[] }[];
  logs: { date: string; project: string; notes: string }[];
}

const WeeklyReportDocument = ({
  companyName, companyLogo, range, weather, events, tasksDone, dispatchByDay, logs,
}: WeeklyReportProps) => (
  <Document>
    <Page size="LETTER" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        {companyLogo ? <PDFImage src={companyLogo} style={pdfStyles.logo} /> : null}
        <View>
          <Text style={pdfStyles.companyName}>{companyName || "Weekly Report"}</Text>
          <Text style={pdfStyles.range}>Weekly Report · {range}</Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Weather Summary</Text>
      {weather ? (
        <>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Today:</Text>
            <Text style={pdfStyles.value}>
              {weather.current.temp}°F · {wmoToInfo(weather.current.code).label} · {weather.current.wind} mph wind
            </Text>
          </View>
          {weather.daily.map((d) => (
            <View key={d.date} style={pdfStyles.row}>
              <Text style={pdfStyles.label}>{format(parseISO(d.date), "EEE MMM d")}:</Text>
              <Text style={pdfStyles.value}>
                {d.max}° / {d.min}° · {wmoToInfo(d.code).label}
              </Text>
            </View>
          ))}
        </>
      ) : <Text style={pdfStyles.empty}>Weather unavailable</Text>}

      <Text style={pdfStyles.sectionTitle}>Calendar Events</Text>
      {events.length === 0 ? <Text style={pdfStyles.empty}>No events.</Text> : events.map((e, i) => (
        <Text key={i} style={pdfStyles.bullet}>
          • {format(parseISO(e.date), "EEE MMM d")}{e.time ? ` ${e.time}` : ""} — {e.title} ({e.project}) [{EVENT_LABELS[e.type] || "Other"}]
        </Text>
      ))}

      <Text style={pdfStyles.sectionTitle}>Tasks Completed This Week</Text>
      {tasksDone.length === 0 ? <Text style={pdfStyles.empty}>None recorded.</Text> : tasksDone.map((t, i) => (
        <Text key={i} style={pdfStyles.bullet}>• {t.title} ({t.project})</Text>
      ))}

      <Text style={pdfStyles.sectionTitle}>Crew Dispatch</Text>
      {dispatchByDay.map((d) => (
        <View key={d.date} style={pdfStyles.dispatchDay}>
          <Text style={pdfStyles.dispatchDate}>{d.date}</Text>
          {d.rows.length === 0
            ? <Text style={pdfStyles.empty}>No assignments.</Text>
            : d.rows.map((r, i) => (
                <Text key={i} style={pdfStyles.bullet}>  {r.member} → {r.project}</Text>
              ))}
        </View>
      ))}

      <Text style={pdfStyles.sectionTitle}>Daily Logs</Text>
      {logs.length === 0 ? <Text style={pdfStyles.empty}>No logs this week.</Text> : logs.map((l, i) => (
        <View key={i} style={pdfStyles.logBlock}>
          <Text style={pdfStyles.logMeta}>{format(parseISO(l.date), "EEE MMM d")} · {l.project}</Text>
          <Text>{l.notes}</Text>
        </View>
      ))}
    </Page>
  </Document>
);