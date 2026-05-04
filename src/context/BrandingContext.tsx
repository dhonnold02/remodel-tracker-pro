import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyBrandPrimary } from "@/lib/brandColor";

export interface BrandSettings {
  brandColor: string | null;
  brandLogoUrl: string | null;
  brandName: string | null;
}

interface BrandingContextValue {
  brand: BrandSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EMPTY: BrandSettings = { brandColor: null, brandLogoUrl: null, brandName: null };

const BrandingContext = createContext<BrandingContextValue>({
  brand: EMPTY,
  loading: true,
  refresh: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandSettings>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    if (!user) {
      setBrand(EMPTY);
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  useEffect(() => {
    applyBrandPrimary(brand.brandColor);
  }, [brand.brandColor]);

  return (
    <BrandingContext.Provider value={{ brand, loading, refresh: fetchBrand }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBrandingContext() {
  return useContext(BrandingContext);
}