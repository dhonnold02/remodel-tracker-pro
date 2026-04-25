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

const SCRIPT_ID = "google-maps-places-script";
let scriptPromise: Promise<boolean> | null = null;

/** Lazy-load the Google Maps JS Places library. Resolves true on success, false otherwise. */
function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(!!w.google?.maps?.places));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&v=weekly`;
    script.onload = () => resolve(!!w.google?.maps?.places);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

const AddressAutocomplete = ({
  value,
  onChange,
  onEnter,
  placeholder = "123 Main St, City",
  className,
}: Props) => {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const sessionTokenRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  // Lazy-load script when component mounts (only if key present)
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMaps(apiKey).then((ok) => {
      if (cancelled) return;
      setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!ready) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const w = window as any;
    const places = w.google?.maps?.places;
    if (!places?.AutocompleteSuggestion) return;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: sessionTokenRef.current,
            includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
          });
        if (cancelled) return;
        const mapped: Suggestion[] = (results || [])
          .map((s: any) => {
            const p = s.placePrediction;
            if (!p) return null;
            return {
              placeId: p.placeId,
              primary: p.mainText?.toString?.() ?? p.text?.toString?.() ?? "",
              secondary: p.secondaryText?.toString?.() ?? "",
            } as Suggestion;
          })
          .filter(Boolean) as Suggestion[];
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setHighlight(0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, ready]);

  // Click outside closes dropdown
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selectSuggestion = async (s: Suggestion) => {
    const w = window as any;
    const places = w.google?.maps?.places;
    skipNextFetchRef.current = true;
    setOpen(false);
    setSuggestions([]);

    try {
      if (places?.Place) {
        const place = new places.Place({ id: s.placeId });
        await place.fetchFields({ fields: ["formattedAddress"] });
        const formatted = (place as any).formattedAddress as string | undefined;
        onChange(formatted || `${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
      } else {
        onChange(`${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
      }
    } catch {
      onChange(`${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
    }

    // Reset session token after a selection (per Google guidance)
    sessionTokenRef.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(suggestions[highlight]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter") {
      onEnter?.();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        className={cn("rounded-xl h-11 pl-9", className)}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm text-foreground transition-colors",
                i === highlight ? "bg-secondary" : "hover:bg-secondary"
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{s.primary}</p>
                  {s.secondary && (
                    <p className="text-xs text-muted-foreground truncate">{s.secondary}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;