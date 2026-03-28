import { useState, useRef } from "react";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "210 100% 65%", // Default blue
  "160 60% 45%",  // Teal
  "340 75% 55%",  // Rose
  "25 95% 55%",   // Orange
  "270 70% 60%",  // Purple
  "145 60% 42%",  // Green
  "0 72% 51%",    // Red
  "45 93% 47%",   // Amber
];

const BrandingSettings = () => {
  const { brand, updateBrand } = useBranding();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(brand.brandName || "");
  const [logoUrl, setLogoUrl] = useState(brand.brandLogoUrl || "");
  const [selectedColor, setSelectedColor] = useState(brand.brandColor || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(path);

      setLogoUrl(urlData.publicUrl + "?t=" + Date.now());
      toast.success("Logo uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  const handleSave = async () => {
    await updateBrand({
      brandName: name.trim() || null,
      brandLogoUrl: logoUrl.trim() || null,
      brandColor: selectedColor || null,
    });
    toast.success("Branding updated!");
    setOpen(false);
  };

  const handleReset = async () => {
    setName("");
    setLogoUrl("");
    setSelectedColor("");
    await updateBrand({ brandName: null, brandLogoUrl: null, brandColor: null });
    toast.success("Branding reset to defaults");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setName(brand.brandName || "");
        setLogoUrl(brand.brandLogoUrl || "");
        setSelectedColor(brand.brandColor || "");
      }
    }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary">
          <Palette className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Custom Branding
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm">Company / Brand Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Company" className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Logo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            {logoUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img src={logoUrl} alt="Logo preview" className="h-12 w-12 rounded-lg object-contain bg-secondary border" onError={(e) => (e.currentTarget.style.display = "none")} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Replace"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2 w-full flex items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading…" : "Upload logo (max 2MB)"}
              </button>
            )}
          </div>

          <div>
            <Label className="text-sm">Brand Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${selectedColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: `hsl(${c})` }}
                />
              ))}
              {selectedColor && (
                <button
                  onClick={() => setSelectedColor("")}
                  className="h-8 w-8 rounded-full border border-dashed border-muted-foreground flex items-center justify-center text-muted-foreground hover:text-foreground"
                  title="Clear color"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">Save Branding</Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandingSettings;
