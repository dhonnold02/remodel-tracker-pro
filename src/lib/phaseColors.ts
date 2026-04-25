// Stable per-phase color (HSL). Mirror of TaskBoard's phaseColor so timeline,
// calendar, and board stay visually in sync.
export interface PhaseColor {
  bar: string;
  soft: string;
  hue: number;
}

export const phaseColor = (i: number): PhaseColor => {
  const hue = (i * 53) % 360;
  return {
    bar: `hsl(${hue} 70% 55%)`,
    soft: `hsl(${hue} 80% 96%)`,
    hue,
  };
};

export const phaseColorFor = (phase: string, phases: string[]): PhaseColor => {
  const idx = Math.max(0, phases.indexOf(phase));
  return phaseColor(idx);
};