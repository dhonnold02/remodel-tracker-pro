import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, ChevronLeft, ChevronRight, Plus, X, Loader2, FileDown,
  Cloud, CloudRain, CloudSnow, Sun, CloudLightning, CloudFog, BookOpen, Upload, Image as ImageIcon,
} from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { format, addDays, startOfWeek, parseISO } from "date-fns";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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

interface WeatherData { current: { temp: number; code: number }; }

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;
  if (GOOGLE_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
      const r = await fetch(url); const d = await r.json();
      const loc = d?.results?.[0]?.geometry?.location;
      if (loc) return { lat: loc.lat, lng: loc.lng };
    } catch {}
  }
  try {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    const city = parts.length >= 2 ? parts[parts.length - 3] || parts[0] : address;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const r = await fetch(url); const d = await r.json();
    const hit = d?.results?.[0];
    if (hit) return { lat: hit.latitude, lng: hit.longitude };
  } catch {}
  return null;
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto&temperature_unit=fahrenheit`;
    const r = await fetch(url); const d = await r.json();
    return { current: { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code } };
  } catch { return null; }
}

interface CrewMember { id: string; name: string; }
interface TimecardRow { id: string; crew_member_id: string; work_date: string; hours: number; }
interface DailyLogRow {
  id: string; project_id: string; log_date: string; notes: string; created_at: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Timecards = () => {
  const { user } = useAuth();
  const { companyId } = useRole();
  const { projects } = useProjects();

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekRange = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 5), "MMM d, yyyy")}`;
  const weekStartKey = format(weekStart, "yyyy-MM-dd");
  const weekEndKey = format(addDays(weekStart, 5), "yyyy-MM-dd");

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [timecards, setTimecards] = useState<TimecardRow[]>([]);
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [logPhotos, setLogPhotos] = useState<Record<string, { id: string; url: string }[]>>({});

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [addingCrew, setAddingCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");

  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logProjectId, setLogProjectId] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savingLog, setSavingLog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company settings
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let { data } = await supabase
        .from("company_settings")
        .select("company_name, address, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data && companyId) {
        const fb = await supabase
          .from("company_settings")
          .select("company_name, address, logo_url")
          .eq("id", companyId)
          .maybeSingle();
        data = fb.data;
      }
      if (cancelled || !data) return;
      setCompanyName(data.company_name || "");
      setCompanyAddress(data.address || "");
      setCompanyLogo(data.logo_url || null);
    })();
    return () => { cancelled = true; };
  }, [user, companyId]);

  // Weather
  useEffect(() => {
    if (!companyAddress) return;
    let cancelled = false;
    (async () => {
      const c = await geocodeAddress(companyAddress);
      if (!c || cancelled) return;
      const w = await fetchWeather(c.lat, c.lng);
      if (!cancelled) setWeather(w);
    })();
    return () => { cancelled = true; };
  }, [companyAddress]);

  // Load crew, timecards, logs
  const loadAll = useCallback(async () => {
    if (!companyId) return;
    const { data: members } = await supabase
      .from("crew_members" as any)
      .select("id, name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    setCrew(((members as any[]) || []).map((m) => ({ id: m.id, name: m.name || "Unnamed" })));

    const { data: tc } = await supabase
      .from("timecards" as any)
      .select("id, crew_member_id, work_date, hours")
      .eq("company_id", companyId)
      .gte("work_date", weekStartKey)
      .lte("work_date", weekEndKey);
    setTimecards(((tc as any[]) || []) as TimecardRow[]);

    const { data: lg } = await supabase
      .from("daily_logs")
      .select("id, project_id, log_date, notes, created_at")
      .eq("company_id", companyId)
      .order("log_date", { ascending: false })
      .limit(30);
    const logRows = ((lg as any[]) || []) as DailyLogRow[];
    setLogs(logRows);

    if (logRows.length) {
      const ids = logRows.map((l) => l.id);
      const { data: ph } = await supabase
        .from("daily_log_photos" as any)
        .select("id, log_id, photo_url")
        .in("log_id", ids);
      const grouped: Record<string, { id: string; url: string }[]> = {};
      ((ph as any[]) || []).forEach((p) => {
        (grouped[p.log_id] ||= []).push({ id: p.id, url: p.photo_url });
      });
      setLogPhotos(grouped);
    } else {
      setLogPhotos({});
    }
  }, [companyId, weekStartKey, weekEndKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const hoursMap = useMemo(() => {
    const m = new Map<string, TimecardRow>();
    timecards.forEach((t) => m.set(`${t.crew_member_id}::${t.work_date}`, t));
    return m;
  }, [timecards]);

  const upsertHours = async (memberId: string, date: string, hours: number) => {
    if (!companyId || !user) return;
    const safe = Math.max(0, Math.min(24, hours || 0));
    const existing = hoursMap.get(`${memberId}::${date}`);
    if (existing && existing.hours === safe) return;
    // Optimistic
    setTimecards((prev) => {
      const without = prev.filter((t) => !(t.crew_member_id === memberId && t.work_date === date));
      return [...without, { id: existing?.id || `tmp-${memberId}-${date}`, crew_member_id: memberId, work_date: date, hours: safe }];
    });
    const { error } = await supabase
      .from("timecards" as any)
      .upsert({
        company_id: companyId,
        crew_member_id: memberId,
        work_date: date,
        hours: safe,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "company_id,crew_member_id,work_date" } as any);
    if (error) { showError("Failed to save hours"); loadAll(); }
  };

  const handleAddCrew = async () => {
    if (!user || !companyId) return;
    const name = newCrewName.trim();
    if (!name) return;
    const { error } = await supabase.from("crew_members" as any).insert({
      company_id: companyId, created_by: user.id, name,
    } as any);
    if (error) { showError("Failed to add crew member"); return; }
    setNewCrewName(""); setAddingCrew(false);
    showSuccess("Crew member added");
    loadAll();
  };

  // Daily totals + grand total
  const dailyTotals = weekDays.map((d) => {
    const k = format(d, "yyyy-MM-dd");
    return crew.reduce((s, c) => s + (hoursMap.get(`${c.id}::${k}`)?.hours || 0), 0);
  });
  const grandTotal = dailyTotals.reduce((a, b) => a + b, 0);
  const memberTotal = (memberId: string) =>
    weekDays.reduce((s, d) => s + (hoursMap.get(`${memberId}::${format(d, "yyyy-MM-dd")}`)?.hours || 0), 0);

  // ── Photo upload ──
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => {
      if (f.size > 10 * 1024 * 1024) { showError(`${f.name} exceeds 10MB`); return false; }
      return true;
    });
    setPendingFiles((prev) => [...prev, ...arr]);
  };

  const handleSaveLog = async () => {
    if (!user || !companyId) return;
    if (!logProjectId) { showError("Pick a project"); return; }
    if (!logNotes.trim()) { showError("Add some notes"); return; }
    setSavingLog(true);
    const { data: inserted, error } = await supabase.from("daily_logs").insert({
      company_id: companyId, project_id: logProjectId, log_date: logDate,
      notes: logNotes.trim(), created_by: user.id,
    }).select("id").maybeSingle();
    if (error || !inserted) { setSavingLog(false); showError("Failed to save log"); return; }

    // Upload photos
    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${companyId}/${inserted.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("daily-log-photos").upload(path, file, { upsert: false });
      if (upErr) { showError(`Failed to upload ${file.name}`); continue; }
      const { data: pub } = supabase.storage.from("daily-log-photos").getPublicUrl(path);
      await supabase.from("daily_log_photos" as any).insert({
        log_id: inserted.id, company_id: companyId, photo_url: pub.publicUrl, created_by: user.id,
      } as any);
    }
    setSavingLog(false);
    setLogNotes(""); setPendingFiles([]);
    showSuccess("Daily log saved");
    loadAll();
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || "Unknown";

  // ── Export ──
  const handleExport = () => {
    const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string));
    const headerRow = `<tr><th>Crew Member</th>${weekDays.map((d) => `<th>${format(d, "EEE M/d")}</th>`).join("")}<th>Total</th></tr>`;
    const bodyRows = crew.map((c) => {
      const cells = weekDays.map((d) => {
        const h = hoursMap.get(`${c.id}::${format(d, "yyyy-MM-dd")}`)?.hours || 0;
        return `<td style="text-align:center">${h || "—"}</td>`;
      }).join("");
      return `<tr><td>${esc(c.name)}</td>${cells}<td style="text-align:center;font-weight:700">${memberTotal(c.id) || 0}</td></tr>`;
    }).join("");
    const totalsRow = `<tr><td style="font-weight:700">Daily totals</td>${dailyTotals.map((t) => `<td style="text-align:center;font-weight:700">${t || 0}</td>`).join("")}<td style="text-align:center;font-weight:700">${grandTotal}</td></tr>`;

    const weekLogs = logs.filter((l) => l.log_date >= weekStartKey && l.log_date <= weekEndKey);
    const logsHtml = weekLogs.length === 0
      ? `<p style="color:#9ca3af;font-style:italic">No daily logs this week.</p>`
      : weekLogs.map((l) => {
          const photos = (logPhotos[l.id] || []).map((p) => p.url.split("/").pop()).join(", ");
          return `<div style="border-left:3px solid #3b82f6;padding:6px 12px;margin-bottom:14px">
            <div style="font-weight:700;font-size:11px;text-transform:uppercase">${esc(format(parseISO(l.log_date), "EEE MMM d"))} · ${esc(projectName(l.project_id))}</div>
            <div style="white-space:pre-wrap;font-size:11px">${esc(l.notes)}</div>
            ${photos ? `<div style="font-size:10px;color:#6b7280;margin-top:4px">Photos: ${esc(photos)}</div>` : ""}
          </div>`;
        }).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Timecard ${esc(weekRange)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;color:#111827;margin:40px;font-size:12px}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #3b82f6;padding-bottom:18px;margin-bottom:24px}
h1{font-size:24px;margin:0}
.range{color:#6b7280;font-size:13px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th,td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:left}
th{background:#f9fafb;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6b7280}
.logo{max-height:50px;max-width:150px;object-fit:contain}
h2{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;margin:24px 0 10px;border-left:3px solid #3b82f6;padding:6px 10px;background:#f3f4f6}
@media print{body{margin:14mm}}
</style></head><body>
<header>
<div><h1>${esc(companyName || "Timecard")}</h1><div class="range">${esc(weekRange)}</div></div>
${companyLogo ? `<img class="logo" src="${esc(companyLogo)}" />` : ""}
</header>
<h2>Weekly Timecard</h2>
<table><thead>${headerRow}</thead><tbody>${bodyRows || `<tr><td colspan="${weekDays.length + 2}" style="text-align:center;color:#9ca3af">No crew members</td></tr>`}${crew.length ? totalsRow : ""}</tbody></table>
<h2>Daily Logs</h2>
${logsHtml}
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { showError("Pop-ups blocked"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
  };

  return (
    <AppLayout
      title="Timecards"
      actions={
        <Button onClick={handleExport} className="rounded-xl">
          <FileDown className="h-4 w-4 mr-2" /> Export Timecard
        </Button>
      }
    >
      <div className="px-6 py-5 space-y-5 bg-[hsl(210_20%_98%)] -m-4 lg:-m-8 min-h-full">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timecards</h1>
          <p className="text-sm text-muted-foreground">Track weekly hours and daily field logs.</p>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-lg h-9"
            onClick={() => setWeekStart((d) => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium tabular-nums">{weekRange}</div>
          <Button variant="outline" size="sm" className="rounded-lg h-9"
            onClick={() => setWeekStart((d) => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-lg h-9 text-xs"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            This week
          </Button>
        </div>

        {/* Timecard grid */}
        <div className="bg-white rounded-xl border border-[hsl(214_13%_90%)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(214_13%_90%)]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Crew Member</th>
                  {weekDays.map((d) => (
                    <th key={d.toISOString()} className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                      <div>{format(d, "EEE")}</div>
                      <div className="text-[10px] text-muted-foreground/70 normal-case font-normal">{format(d, "M/d")}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {crew.length === 0 ? (
                  <tr><td colSpan={weekDays.length + 3} className="px-4 py-10 text-center text-sm text-muted-foreground">No crew members yet.</td></tr>
                ) : crew.map((c) => (
                  <tr key={c.id} className="border-b border-[hsl(214_13%_94%)] last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                    {weekDays.map((d) => {
                      const k = format(d, "yyyy-MM-dd");
                      const cur = hoursMap.get(`${c.id}::${k}`)?.hours;
                      return (
                        <td key={k} className="px-2 py-2 text-center">
                          <HourCell
                            value={cur ?? null}
                            onSave={(n) => upsertHours(c.id, k, n)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                      {memberTotal(c.id) || "—"}
                    </td>
                    <td></td>
                  </tr>
                ))}
                {crew.length > 0 && (
                  <tr className="bg-[hsl(210_20%_98%)] border-t border-[hsl(214_13%_90%)]">
                    <td className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daily totals</td>
                    {dailyTotals.map((t, i) => (
                      <td key={i} className="px-3 py-2.5 text-center font-semibold tabular-nums">{t || "—"}</td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-bold tabular-nums text-primary">{grandTotal || "—"}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[hsl(214_13%_90%)] px-4 py-3 flex items-center justify-between bg-white">
            {addingCrew ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  autoFocus
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCrew(); if (e.key === "Escape") { setAddingCrew(false); setNewCrewName(""); } }}
                  placeholder="Crew member name"
                  className="h-9 max-w-xs"
                />
                <Button size="sm" className="h-9 rounded-lg" onClick={handleAddCrew}>Add</Button>
                <Button size="sm" variant="ghost" className="h-9 rounded-lg" onClick={() => { setAddingCrew(false); setNewCrewName(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="rounded-lg h-9" onClick={() => setAddingCrew(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Crew Member
              </Button>
            )}
          </div>
        </div>

        {/* Daily Log */}
        <div className="bg-white rounded-xl border border-[hsl(214_13%_90%)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Daily Log</h2>
            </div>
            {weather && (() => {
              const info = wmoToInfo(weather.current.code);
              const Icon = info.Icon;
              return (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {weather.current.temp}°F · {info.label}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="h-10 rounded-lg" />
            <Select value={logProjectId} onValueChange={setLogProjectId}>
              <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="What was completed today?"
            rows={4}
            className="rounded-lg"
          />

          {/* Photo upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[hsl(214_13%_85%)] rounded-lg p-5 text-center cursor-pointer hover:bg-[hsl(210_20%_98%)] transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Drag & drop or click — JPG/PNG/HEIC up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <div key={i} className="text-xs bg-secondary rounded-lg px-2 py-1 flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" />{f.name}
                  <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSaveLog} disabled={savingLog} className="rounded-xl">
              {savingLog && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Log
            </Button>
          </div>

          {/* Past entries */}
          <div className="pt-4 border-t border-[hsl(214_13%_90%)]">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Past entries</h3>
            {logs.length === 0 ? (
              <EmptyState icon={BookOpen} title="No daily logs yet" />
            ) : (
              <ul className="space-y-3">
                {logs.map((l) => {
                  const photos = logPhotos[l.id] || [];
                  return (
                    <li key={l.id} className="rounded-lg border border-[hsl(214_13%_90%)] bg-white p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {format(parseISO(l.log_date), "EEE MMM d, yyyy")} · {projectName(l.project_id)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{l.notes}</p>
                      {photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {photos.map((p) => (
                            <a key={p.id} href={p.url} target="_blank" rel="noreferrer"
                              className="aspect-square rounded-lg overflow-hidden border border-[hsl(214_13%_90%)] bg-secondary block">
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

// ── Hour cell with debounced save ──
const HourCell = ({ value, onSave }: { value: number | null; onSave: (n: number) => void }) => {
  const [local, setLocal] = useState<string>(value != null ? String(value) : "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(value != null && value !== 0 ? String(value) : "");
  }, [value]);

  const flush = (raw: string) => {
    const n = Number(raw);
    if (!isNaN(n)) onSave(n);
  };

  return (
    <input
      type="number"
      min={0}
      max={24}
      step={0.5}
      placeholder="—"
      value={local}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        flush(local);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(v), 500);
      }}
      className="h-8 w-16 text-center rounded-lg border border-[hsl(214_13%_90%)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary tabular-nums"
    />
  );
};

export default Timecards;
