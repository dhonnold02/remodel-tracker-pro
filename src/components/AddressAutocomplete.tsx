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

interface NominatimResult {
  place_id: number;
  display_name: string;
  address?: Record<string, string>;
}

interface Suggestion {
  id: number;
  primary: string;
  secondary: string;
  display_name: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const AddressAutocomplete = ({
  value,
  onChange,
  onEnter,
  placeholder = "123 Main St, City",
  className,
}: Props) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch suggestions as user types (debounced)
  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const url = `${NOMINATIM_URL}?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Nominatim request failed");
        const data: NominatimResult[] = await res.json();
        const mapped: Suggestion[] = data.map((r) => {
          const parts = r.display_name.split(",").map((s) => s.trim());
          return {
            id: r.place_id,
            primary: parts[0] || r.display_name,
            secondary: parts.slice(1).join(", "),
            display_name: r.display_name,
          };
        });
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setHighlight(0);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [value]);

  // Click outside closes dropdown
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selectSuggestion = (s: Suggestion) => {
    skipNextFetchRef.current = true;
    setOpen(false);
    setSuggestions([]);
    onChange(s.display_name);
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
      {loading && value.trim().length >= 3 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin pointer-events-none" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 max-h-72 overflow-y-auto"
          style={{
            marginTop: 4,
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: "10px 14px",
                borderBottom:
                  i === suggestions.length - 1
                    ? "none"
                    : "1px solid hsl(var(--border))",
                cursor: "pointer",
                transition: "background 0.15s",
                background:
                  i === highlight ? "hsl(var(--secondary))" : "transparent",
              }}
            >
              <div className="flex items-start gap-2">
                <MapPin
                  className="shrink-0 mt-0.5"
                  style={{
                    width: 14,
                    height: 14,
                    color: "hsl(var(--primary))",
                  }}
                />
                <div className="min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {s.primary}
                  </p>
                  {s.secondary && (
                    <p
                      className="truncate"
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--muted-foreground))",
                        marginTop: 2,
                      }}
                    >
                      {s.secondary}
                    </p>
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
