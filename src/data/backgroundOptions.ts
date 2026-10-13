import type { Step } from "@/data/styleOptions"

// Background patterns drawn behind the frames. Like the frame styles they're
// stepped, so nobody can push a pattern to an extreme. Their colors come from
// the chosen color template (see drawBackground.ts).

export type PatternKind = "none" | "rings" | "ripples"

export const patternSteps: Step<PatternKind>[] = [
  { label: "None", value: "none", description: "Plain background" },
  { label: "Rings", value: "rings", description: "Dashed elliptical rings" },
  { label: "Ripples", value: "ripples", description: "Fluted-glass ripples" },
]

/** How many dashed rings. */
export const ringCountSteps: Step<number>[] = [1, 2, 3, 4, 5].map((count) => ({
  label: String(count),
  value: count,
  description: count === 1 ? "1 ring" : `${count} rings`,
}))

/** Space between rings, in canvas px (measured on the short axis). */
export const ringGapSteps: Step<number>[] = [
  { label: "Tight", value: 72, description: "Rings close together" },
  { label: "Medium", value: 120, description: "Even spacing" },
  { label: "Wide", value: 176, description: "Rings far apart" },
]

/** How many vertical ribs run across the canvas. */
export const ribSteps: Step<number>[] = [
  { label: "Fine", value: 64, description: "Many narrow ribs" },
  { label: "Medium", value: 40, description: "Medium ribs" },
  { label: "Wide", value: 24, description: "Few wide ribs" },
]

/** How far the ribs bend the colors behind them, in canvas px. */
export const waveSteps: Step<number>[] = [
  { label: "Off", value: 0, description: "Straight ribs" },
  { label: "Soft", value: 64, description: "Gentle wave" },
  { label: "Strong", value: 144, description: "Strong wave" },
]

/** Background style, stored as step indexes into the arrays above. */
export type BackgroundStyle = {
  pattern: number
  rings: number
  gap: number
  ribs: number
  wave: number
}

export const defaultBackgroundStyle: BackgroundStyle = {
  pattern: 0,
  rings: 2,
  gap: 1,
  ribs: 1,
  wave: 1,
}

export function isDefaultBackgroundStyle(style: BackgroundStyle) {
  return patternSteps[style.pattern].value === "none"
}
