import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";
import { applyBrandPrimary, BRAND_PRESETS } from "@/lib/brandColor";

interface CompanySettings {
  company_name: string;
  license_number: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo_url: string | null;
  brand_color: string | null;
}

const EMPTY: CompanySettings = {
  company_name: "",
  license_number: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  logo_url: null,
  brand_color: null,
};

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [data, setData] = useState<CompanySettings>(EMPTY);
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
        toast.error("Failed to load company settings — please refresh");
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
          brand_color: row.brand_color ?? null,
        };
        setData(next);
        if (next.brand_color) applyBrandPrimary(next.brand_color);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const pickColor = (hex: string) => {
    update("brand_color", hex);
    applyBrandPrimary(hex);
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
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
      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(path);
      update("logo_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Logo uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
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
      brand_color: data.brand_color || null,
    };
    const { error } = await supabase
      .from("company_settings")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save settings — please try again");
      return;
    }
    applyBrandPrimary(data.brand_color);
    toast.success("Settings saved");
  };

  if (loading) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading settings…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Company profile & brand"
      actions={
        <Button onClick={handleSave} disabled={saving} className="rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      }
    >
      <div className="max-w-3xl space-y-8">
        {/* Company profile */}
        <section className="rounded-2xl border bg-card p-6 space-y-5">
          <header>
            <h2 className="font-heading text-base font-semibold text-foreground">Company Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Used everywhere in the app, including PDF exports.</p>
          </header>

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
              <Textarea id="address" value={data.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Suite 200&#10;Cityville, ST 12345" rows={3} className="mt-1.5 rounded-xl resize-none" />
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label className="text-xs">Company logo</Label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {data.logo_url ? (
              <div className="mt-1.5 flex items-center gap-4 rounded-xl border bg-secondary/40 p-3">
                <img src={data.logo_url} alt="Logo" className="h-16 w-16 rounded-lg bg-background object-contain border" />
                <div className="flex-1 text-xs text-muted-foreground truncate">Current logo</div>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-lg">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => update("logo_url", null)} className="rounded-lg">
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
                  {uploading ? "Uploading…" : "Drag & drop or click to upload (max 2MB)"}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Brand colors */}
        <section className="rounded-2xl border bg-card p-6 space-y-5">
          <header>
            <h2 className="font-heading text-base font-semibold text-foreground">Brand Colors</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pick the primary color for your workspace.</p>
          </header>

          <div>
            <Label className="text-xs">Primary Color</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {BRAND_PRESETS.map((p) => {
                const selected = (data.brand_color || "").toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => pickColor(p.hex)}
                    title={`${p.name} — ${p.hex}`}
                    className={`h-9 w-9 rounded-full border-2 transition-all ${selected ? "border-foreground scale-110 ring-2 ring-foreground/20" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: p.hex }}
                    aria-label={p.name}
                  />
                );
              })}

              <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
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
                  className="ml-1 h-9 px-3 rounded-lg border border-dashed text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border bg-secondary/40 p-3">
              <div
                className="h-10 w-10 rounded-lg border shadow-sm"
                style={{ backgroundColor: data.brand_color || "hsl(var(--primary))" }}
              />
              <div className="text-xs">
                <div className="font-semibold text-foreground">Preview</div>
                <div className="text-muted-foreground">
                  This color will appear on buttons, links, highlights, and your exported PDFs.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;