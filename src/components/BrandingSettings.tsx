import { useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(brand.brandName || "");
  const [logoUrl, setLogoUrl] = useState(brand.brandLogoUrl || "");
  const [selectedColor, setSelectedColor] = useState(brand.brandColor || "");

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
            <Label className="text-sm">Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="mt-1" />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={logoUrl} alt="Logo preview" className="h-8 w-8 rounded object-contain bg-secondary" onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
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
