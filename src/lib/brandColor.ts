/**
 * Brand color helpers.
 *
 * The Settings page lets users pick a primary brand color either from
 * preset hex swatches or via <input type="color">. The app's design system
 * stores colors as raw HSL triplets (e.g. "213 90% 60%") so they can be
 * dropped into `hsl(var(--primary))` references.
 *
 * `applyBrandPrimary` accepts either a hex string (#3b82f6) OR an already
 * formatted HSL triplet ("213 90% 60%") and writes it to the document root
 * so the entire app reflects it instantly.
 */

export function hexToHslTriplet(hex: string): string | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hh = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }

  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Accepts hex (#rrggbb / #rgb) or an HSL triplet ("H S% L%"). */
export function toHslTriplet(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("#")) return hexToHslTriplet(v);
  // Already an HSL triplet — accept as-is.
  if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(v)) return v;
  // hsl(...) wrapper
  const m = v.match(/^hsl\(\s*(\d{1,3})[,\s]+(\d{1,3})%?[,\s]+(\d{1,3})%?\s*\)$/i);
  if (m) return `${m[1]} ${m[2]}% ${m[3]}%`;
  return null;
}

export function applyBrandPrimary(value: string | null | undefined) {
  const triplet = toHslTriplet(value);
  if (!triplet) {
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--sidebar-primary");
    document.documentElement.style.removeProperty("--sidebar-ring");
    return;
  }
  document.documentElement.style.setProperty("--primary", triplet);
  document.documentElement.style.setProperty("--ring", triplet);
  document.documentElement.style.setProperty("--sidebar-primary", triplet);
  document.documentElement.style.setProperty("--sidebar-ring", triplet);
}

export const BRAND_PRESETS: { name: string; hex: string }[] = [
  { name: "Steel Blue", hex: "#3b82f6" },
  { name: "Navy",       hex: "#1e3a8a" },
  { name: "Emerald",    hex: "#059669" },
  { name: "Slate",      hex: "#475569" },
  { name: "Orange",     hex: "#ea580c" },
  { name: "Red",        hex: "#dc2626" },
  { name: "Purple",     hex: "#7c3aed" },
  { name: "Black",      hex: "#18181b" },
];