import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyBrandPrimary } from "@/lib/brandColor";

export interface BrandSettings {
  brandColor: string | null;
  brandLogoUrl: string | null;
  brandName: string | null;
}

/**
 * Single source of truth for company branding. Reads from `company_settings`,
 * which is managed exclusively from the /settings page.
 */
export function useBranding() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandSettings>({ brandColor: null, brandLogoUrl: null, brandName: null });
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("company_settings")
      .select("company_name, logo_url, brand_color")
      .eq("user_id", user.id)
      .maybeSingle();

    setBrand({
      brandColor: (data as any)?.brand_color || null,
      brandLogoUrl: (data as any)?.logo_url || null,
      brandName: (data as any)?.company_name?.trim() || null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBrand(); }, [fetchBrand]);

  // Apply brand color as CSS variable whenever it changes.
  useEffect(() => {
    applyBrandPrimary(brand.brandColor);
  }, [brand.brandColor]);

  return { brand, loading, refresh: fetchBrand };
}
