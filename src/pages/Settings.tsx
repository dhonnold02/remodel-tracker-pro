import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, Check, LogOut, Building2, Palette, Sun, Bell } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";
import { applyBrandPrimary, BRAND_PRESETS } from "@/lib/brandColor";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import SectionHeader from "@/components/SectionHeader";
import { cn } from "@/lib/utils";

interface CompanySettings {
  company_name: string;
  license_number: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo_url: string | null;
  logo_path: string | null;
  brand_color: string | null;
  notify_tasks: boolean;
  notify_notes: boolean;
  notify_invoices: boolean;
  notify_calendar_events: boolean;
  dark_mode: boolean;
}

const EMPTY: CompanySettings = {
  company_name: "",
  license_number: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  logo_url: null,
  logo_path: null,
  brand_color: null,
  notify_tasks: false,
  notify_notes: false,
  notify_invoices: false,
  notify_calendar_events: false,
  dark_mode: false,
};

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { canAccessSettings, loading: roleLoading } = useRole();
  const [loading, setLoading] = useState(true);

  // Owner-only — silently redirect anyone else.
  useEffect(() => {
    if (roleLoading) return;
    if (!canAccessSettings) navigate("/", { replace: true });
  }, [roleLoading, canAccessSettings, navigate]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [data, setData] = useState<CompanySettings>(EMPTY);
  const [savedSnapshot, setSavedSnapshot] = useState<CompanySettings>(EMPTY);
  const hasUnsavedChanges = JSON.stringify(data) !== JSON.stringify(savedSnapshot);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing settings
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        showError("Failed to load company settings — please refresh");
        setLoading(false);
        return;
      }

      if (row) {
        const next: CompanySettings = {
          company_name: row.company_name ?? "",
          license_number: row.license_number ?? "",
          phone: row.phone ?? "",
          email: row.email ?? "",
          website: row.website ?? "",
          address: row.address ?? "",
          logo_url: row.logo_url ?? null,
          logo_path: (row as any).logo_path ?? null,
          brand_color: row.brand_color ?? null,
          notify_tasks: row.notify_tasks ?? false,
          notify_notes: row.notify_notes ?? false,
          notify_invoices: row.notify_invoices ?? false,
          notify_calendar_events: (row as any).notify_calendar_events ?? false,
          dark_mode: (row as any).dark_mode ?? false,
        };
        setData(next);
        setSavedSnapshot(next);
        if (next.brand_color) applyBrandPrimary(next.brand_color);
        if (next.dark_mode) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Warn before unload when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Intercept in-app (React Router) navigation while there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const confirmMsg = "You have unsaved changes. Are you sure you want to leave?";
    window.history.pushState = function (...args) {
      if (!window.confirm(confirmMsg)) return;
      return originalPush.apply(this, args as any);
    };
    window.history.replaceState = function (...args) {
      if (!window.confirm(confirmMsg)) return;
      return originalReplace.apply(this, args as any);
    };
    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, [hasUnsavedChanges]);

  const update = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const [activeSection, setActiveSection] = useState<"profile" | "brand" | "appearance" | "notifications">("profile");
  const sections = [
    { id: "profile" as const, label: "Company Profile", icon: Building2 },
    { id: "brand" as const, label: "Brand Color", icon: Palette },
    { id: "appearance" as const, label: "Appearance", icon: Sun },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  const pickColor = (hex: string) => {
    update("brand_color", hex);
    applyBrandPrimary(hex);
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError("Logo must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData, error: urlErr } = await supabase.storage
        .from("company-assets")
        .createSignedUrl(path, 315360000);
      if (urlErr) throw urlErr;
      update("logo_url", urlData.signedUrl);
      update("logo_path", path);
      showSuccess("Logo uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      showError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogo(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      company_name: data.company_name.trim(),
      license_number: data.license_number.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      website: data.website.trim(),
      address: data.address.trim(),
      logo_url: data.logo_url || null,
      logo_path: data.logo_path || null,
      brand_color: data.brand_color || null,
      notify_tasks: data.notify_tasks,
      notify_notes: data.notify_notes,
      notify_invoices: data.notify_invoices,
      notify_calendar_events: data.notify_calendar_events,
      dark_mode: data.dark_mode,
    };
    const { error } = await supabase
      .from("company_settings")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      showError("Failed to save settings — please try again");
      return;
    }
    applyBrandPrimary(data.brand_color);
    setSavedSnapshot(data);
    showSuccess("Settings saved");
  };

  if (loading) {
    return (
      <AppLayout title="Settings">
        <PageLoader message="Loading settings…" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Manage your company profile and preferences"
      actions={
        <Button onClick={handleSave} disabled={saving} className="h-9 rounded-lg hidden md:inline-flex">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      }
    >
      <div className="-m-4 lg:-m-8 min-h-full bg-[hsl(210_20%_98%)] px-6 py-5 pb-44 md:pb-8">
        <div className="flex gap-6">
          {/* Left nav */}
          <aside className="hidden md:block w-48 shrink-0">
            <nav className="sticky top-20 space-y-1">
              {sections.map((s) => {
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 hover:bg-white"
                    )}
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 max-w-3xl space-y-6">
        {/* Company profile */}
        {(activeSection === "profile" || true) && (
        <section data-section="profile" className={cn("rounded-xl border border-[hsl(214_13%_90%)] bg-white p-5 space-y-5", activeSection !== "profile" && "hidden md:hidden")}>
          <SectionHeader
            title="Company Profile"
            subtitle="Used everywhere in the app, including PDF exports."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name" className="text-xs">Company name</Label>
              <Input id="company_name" value={data.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Acme Construction" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="license" className="text-xs">License number</Label>
              <Input id="license" value={data.license_number} onChange={(e) => update("license_number", e.target.value)} placeholder="CGC1234567" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input id="phone" type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="hello@acme.com" className="mt-1.5 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="website" className="text-xs">Website</Label>
              <Input id="website" type="url" value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://acme.com" className="mt-1.5 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-xs">Physical address</Label>
              <div className="mt-1.5">
                <AddressAutocomplete
                  value={data.address}
                  onChange={(v) => update("address", v)}
                  placeholder="123 Main St, Cityville, ST 12345"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label className="text-xs">Company logo</Label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {data.logo_url ? (
              <div className="mt-1.5 flex items-center gap-4 rounded-xl border bg-secondary/40 p-3">
                <img src={data.logo_url} alt="Logo" className="h-16 w-16 rounded-xl bg-background object-contain border" />
                <div className="flex-1 text-xs text-muted-foreground truncate">Current logo</div>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-xl">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => update("logo_url", null)} className="rounded-xl">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                disabled={uploading}
                className={`mt-1.5 w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-xs font-medium">
                  {uploading ? "Uploading…" : "Drop your logo here or click to upload"}
                </span>
                {!uploading && (
                  <span className="text-xs text-muted-foreground/80">
                    PNG, JPG, SVG up to 2MB
                  </span>
                )}
              </button>
            )}
          </div>
        </section>
        )}

        {/* Brand colors */}
        <section data-section="brand" className={cn("rounded-xl border border-[hsl(214_13%_90%)] bg-white p-5 space-y-5", activeSection !== "brand" && "hidden md:hidden")}>
          <SectionHeader
            title="Brand Color"
            subtitle="Applied to buttons, highlights, and your exported PDFs."
          />

          <div>
            <div className="grid grid-cols-8 gap-2 items-center">
              {BRAND_PRESETS.map((p) => {
                const selected = (data.brand_color || "").toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => pickColor(p.hex)}
                    title={`${p.name} — ${p.hex}`}
                    className={`h-9 w-9 rounded-lg border-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${selected ? "border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: p.hex }}
                    aria-label={p.name}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="color"
                  value={data.brand_color && data.brand_color.startsWith("#") ? data.brand_color : "#3b82f6"}
                  onChange={(e) => pickColor(e.target.value)}
                  className="h-9 w-9 rounded-lg border bg-transparent cursor-pointer"
                  aria-label="Custom color"
                />
                Custom
              </label>

              {data.brand_color && (
                <button
                  type="button"
                  onClick={() => { update("brand_color", null); applyBrandPrimary(null); }}
                  className="h-9 px-3 rounded-lg border border-dashed text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-[hsl(214_13%_90%)] bg-[hsl(210_20%_98%)] p-4 space-y-3">
              <div className="text-xs font-semibold text-foreground">Preview</div>
              <div className="flex items-center gap-3">
                <Button type="button" size="sm" className="rounded-xl pointer-events-none">
                  Sample button
                </Button>
                <div className="flex-1">
                  <Progress value={62} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        {/* Appearance */}
        <section data-section="appearance" className={cn("rounded-xl border border-[hsl(214_13%_90%)] bg-white p-5 space-y-5", activeSection !== "appearance" && "hidden md:hidden")}>
          <SectionHeader
            title="Appearance"
            subtitle="Switch between light and dark themes."
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[hsl(214_13%_90%)] bg-[hsl(210_20%_98%)] px-4 py-3">
            <Label htmlFor="dark_mode" className="text-sm font-medium text-foreground cursor-pointer flex-1">
              Dark mode
            </Label>
            <Switch
              id="dark_mode"
              checked={data.dark_mode}
              onCheckedChange={(checked) => {
                update("dark_mode", checked);
                if (checked) document.documentElement.classList.add("dark");
                else document.documentElement.classList.remove("dark");
              }}
            />
          </div>
        </section>

        <section data-section="notifications" className={cn("rounded-xl border border-[hsl(214_13%_90%)] bg-white p-5 space-y-5", activeSection !== "notifications" && "hidden md:hidden")}>
          <SectionHeader
            title="Notifications"
            subtitle="Choose when Sightline emails you about activity and upcoming events."
          />

          <div className="space-y-3">
            {[
              { key: "notify_tasks" as const,    label: "Email me when a team member completes a task" },
              { key: "notify_notes" as const,    label: "Email me when a note or comment is added" },
              { key: "notify_invoices" as const, label: "Email me when an invoice is added" },
              { key: "notify_calendar_events" as const, label: "Email me when a calendar event is upcoming (24 hours before)" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-[hsl(214_13%_90%)] bg-[hsl(210_20%_98%)] px-4 py-3">
                <Label htmlFor={key} className="text-sm font-medium text-foreground cursor-pointer flex-1">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={data[key]}
                  onCheckedChange={(checked) => update(key, checked)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Sign out (mobile only) */}
        <div className="md:hidden pt-2">
          <Button
            onClick={signOut}
            variant="ghost"
            size="lg"
            className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky save (sits above the bottom tab bar) */}
      <div
        className="md:hidden fixed inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm p-3"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </AppLayout>
  );
};

export default Settings;