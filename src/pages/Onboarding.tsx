import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import SightlineLogo from "@/components/SightlineLogo";
import PageLoader from "@/components/PageLoader";
import { applyBrandPrimary, BRAND_PRESETS, readableForegroundColor } from "@/lib/brandColor";
import { Loader2, Upload, X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";

type Step = 1 | 2 | 3;

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { addProject, updateProject } = useProjects();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");

  // Bounce the user out if they've already completed onboarding (or have settings).
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.onboarding_complete) {
        navigate("/", { replace: true });
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  const pickColor = (hex: string) => {
    setBrandColor(hex);
    applyBrandPrimary(hex);
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { showError("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { showError("Logo must be under 2MB"); return; }
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
      setLogoUrl(urlData.signedUrl);
      setLogoPath(path);
      showSuccess("Logo uploaded");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Upload failed");
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

  // Saves whatever's been filled in so far. Used between steps and on skip/finish.
  const saveSettings = async (opts: { complete?: boolean } = {}) => {
    if (!user) return false;
    const payload = {
      user_id: user.id,
      company_name: companyName.trim(),
      license_number: licenseNumber.trim(),
      phone: phone.trim(),
      logo_url: logoUrl,
      logo_path: logoPath,
      brand_color: brandColor,
      ...(opts.complete ? { onboarding_complete: true } : {}),
    };
    const { data: settings, error } = await supabase
      .from("company_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("id")
      .maybeSingle();
    if (error) {
      showError("Couldn't save — please try again");
      return false;
    }

    // Ensure an `owner` membership row exists for this user so the
    // role-based access system recognises them as the company owner.
    if (settings?.id) {
      const { data: existing } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", settings.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("company_members").insert({
          company_id: settings.id,
          user_id: user.id,
          role: "owner",
        });
      }
    }
    return true;
  };

  const handleStep1 = async () => {
    if (!companyName.trim()) {
      showError("Company name is required");
      return;
    }
    setSubmitting(true);
    const ok = await saveSettings();
    setSubmitting(false);
    if (ok) setStep(2);
  };

  const handleStep2 = async (skip = false) => {
    setSubmitting(true);
    const ok = await saveSettings();
    setSubmitting(false);
    if (ok) setStep(3);
    void skip;
  };

  const finishWithProject = async () => {
    if (!projectName.trim()) {
      showError("Project name is required");
      return;
    }
    setSubmitting(true);
    try {
      await saveSettings({ complete: true });
      const id = await addProject(projectName.trim());
      if (projectAddress.trim()) {
        await updateProject(id, { address: projectAddress.trim() } as any);
      }
      navigate(`/project/${id}`, { replace: true });
    } catch (err) {
      showError("Couldn't create project — please try again");
      setSubmitting(false);
    }
  };

  const skipToDashboard = async () => {
    setSubmitting(true);
    await saveSettings({ complete: true });
    navigate("/", { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background flair */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border bg-card shadow-xl p-6 sm:p-8 space-y-6">
          {/* Logo + step indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <SightlineLogo size={32} />
                <span className="font-heading text-sm font-semibold text-foreground">Sightline</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Step {step} of 3
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content with subtle fade */}
          <div key={step} className="animate-in fade-in duration-300">
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Welcome to Sightline
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Let's set up your company profile in 2 minutes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company_name" className="text-xs">
                      Company name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      autoFocus
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Construction"
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="license" className="text-xs">License number <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="license"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="CGC1234567"
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span aria-hidden />
                  <Button
                    onClick={handleStep1}
                    disabled={submitting || !companyName.trim()}
                    className="h-11 rounded-xl flex-1 sm:flex-none sm:min-w-[12rem]"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Make it yours
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Choose your brand color and upload your logo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Brand color</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {BRAND_PRESETS.map((p) => {
                      const selected = (brandColor || "").toLowerCase() === p.hex.toLowerCase();
                      return (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => pickColor(p.hex)}
                          title={`${p.name} — ${p.hex}`}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            selected ? "border-foreground scale-110 ring-2 ring-foreground/20" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: p.hex }}
                          aria-label={p.name}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Logo</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  {logoUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 p-3">
                      <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-xl bg-background object-contain border" />
                      <div className="flex-1 text-xs text-muted-foreground truncate">Logo uploaded</div>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-xl">
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLogoUrl(null)} className="rounded-xl">
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
                      className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-sm transition-colors ${
                        dragOver
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                      <span className="text-xs font-medium">
                        {uploading ? "Uploading…" : "Drop your logo or click to upload"}
                      </span>
                      {!uploading && (
                        <span className="text-xs text-muted-foreground/80">PNG, JPG, SVG up to 2MB</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Live preview */}
                <div className="space-y-2">
                  <Label className="text-xs">Preview</Label>
                  <div className="rounded-xl border bg-secondary/30 p-4">
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-10 w-10 rounded-xl bg-background object-contain border" />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold"
                          style={{
                            backgroundColor: brandColor || "hsl(var(--primary))",
                            color: readableForegroundColor(brandColor),
                          }}
                        >
                          {(companyName || "S").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {companyName || "Your company"}
                        </div>
                        <div className="text-xs text-muted-foreground">Sample project</div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: brandColor || "hsl(var(--primary))",
                          color: readableForegroundColor(brandColor),
                        }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={submitting}
                      className="h-11 rounded-xl"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={() => handleStep2(false)}
                      disabled={submitting}
                      className="h-11 rounded-xl flex-1 sm:flex-none sm:min-w-[12rem]"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStep2(true)}
                    disabled={submitting}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Create your first project
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    You're all set — start tracking your first job.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project_name" className="text-xs">Project name</Label>
                    <Input
                      id="project_name"
                      autoFocus
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Smith Kitchen Remodel"
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Project address</Label>
                    <div className="mt-1.5">
                      <AddressAutocomplete
                        value={projectAddress}
                        onChange={setProjectAddress}
                        placeholder="123 Main St, City"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={submitting}
                      className="h-11 rounded-xl"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={finishWithProject}
                      disabled={submitting || !projectName.trim()}
                      className="h-11 rounded-xl flex-1 sm:flex-none sm:min-w-[16rem]"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Create & Go to Dashboard
                        </>
                      )}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={skipToDashboard}
                    disabled={submitting}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;