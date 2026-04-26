import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
  "AIzaSyA_sOPvjxhs8rsD8-6DLsvXdHjpen4Mj7Q";
const SCRIPT_ID = "google-maps-places-script";
const STYLE_ID = "google-pac-dark-theme-overrides";

const PAC_CSS = `
.pac-container {
  background: hsl(226, 15%, 11%) !important;
  border: 1px solid hsl(226, 12%, 17%) !important;
  border-radius: 12px !important;
  margin-top: 4px !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
  font-family: inherit !important;
  overflow: hidden !important;
}
.pac-item {
  padding: 10px 14px !important;
  border-top: 1px solid hsl(226, 12%, 17%) !important;
  background: transparent !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
}
.pac-item:first-child { border-top: none !important; }
.pac-item:hover, .pac-item-selected {
  background: hsl(226, 12%, 15%) !important;
}
.pac-item-query {
  color: hsl(220, 15%, 92%) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}
.pac-matched { color: hsl(213, 90%, 60%) !important; }
.pac-icon { display: none !important; }
.pac-secondary-text {
  color: hsl(220, 8%, 52%) !important;
  font-size: 11px !important;
  margin-left: 4px !important;
}
.pac-logo:after { display: none !important; }
`;

const injectPacStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PAC_CSS;
  document.head.appendChild(style);
};

const loadGoogleMaps = (): Promise<any> => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!GOOGLE_MAPS_API_KEY) return Promise.resolve(null);
  // Already loaded
  if ((window as any).google?.maps?.places) {
    return Promise.resolve((window as any).google);
  }
  // Already loading
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve((window as any).google ?? null));
      existing.addEventListener("error", () => reject(null));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google ?? null);
    script.onerror = () => reject(null);
    document.head.appendChild(script);
  });
};

const AddressAutocomplete = ({
  value,
  onChange,
  onEnter,
  placeholder = "123 Main St, City",
  className,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Load Google Maps + attach Autocomplete
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !g || !inputRef.current) return;
        injectPacStyles();
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
        });
        ac.setFields(["formatted_address", "address_components"]);
        autocompleteRef.current = ac;
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place?.formatted_address;
          if (formatted) onChange(formatted.replace(/,\s*USA$/, ""));
        });
        setReady(true);
      })
      .catch(() => {
        // Silent fallback to plain input
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // If Google's pac container is open, let it handle the Enter for selection
      const pac = document.querySelector(".pac-container");
      const pacVisible = pac && (pac as HTMLElement).offsetParent !== null;
      if (!pacVisible) onEnter?.();
    }
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className={cn("rounded-xl h-11 pl-9", className)}
      />
    </div>
  );
};

export default AddressAutocomplete;
