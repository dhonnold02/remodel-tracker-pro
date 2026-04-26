import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BrandSettings {
  brandColor: string | null;
  brandLogoUrl: string | null;
  brandName: string | null;
}

export function useBranding() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandSettings>({ brandColor: null, brandLogoUrl: null, brandName: null });
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("brand_color, brand_logo_url, brand_name")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no row found, which is acceptable for a brand-not-set-yet user
      toast.error("Failed to load branding settings — please refresh");
      setLoading(false);
      return;
    }

    if (data) {
      setBrand({
        brandColor: (data as any).brand_color || null,
        brandLogoUrl: (data as any).brand_logo_url || null,
        brandName: (data as any).brand_name || null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBrand(); }, [fetchBrand]);

  const updateBrand = useCallback(async (updates: Partial<BrandSettings>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.brandColor !== undefined) dbUpdates.brand_color = updates.brandColor;
    if (updates.brandLogoUrl !== undefined) dbUpdates.brand_logo_url = updates.brandLogoUrl;
    if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;

    await supabase.from("profiles").update(dbUpdates).eq("id", user.id);
    setBrand((prev) => ({ ...prev, ...updates }));
  }, [user]);

  // Apply brand color as CSS variable
  useEffect(() => {
    if (brand.brandColor) {
      document.documentElement.style.setProperty("--primary", brand.brandColor);
      document.documentElement.style.setProperty("--accent", brand.brandColor);
      document.documentElement.style.setProperty("--ring", brand.brandColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--ring");
    }
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--accent");
      document.documentElement.style.removeProperty("--ring");
    };
  }, [brand.brandColor]);

  return { brand, loading, updateBrand };
}
