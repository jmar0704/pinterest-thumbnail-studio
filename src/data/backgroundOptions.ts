import type { Step } from "@/data/styleOptions"

// Background patterns drawn behind the frames. Like the frame styles they're
// stepped, so nobody can push a pattern to an extreme. Their colors come from
// the chosen color template (see drawBackground.ts).

export type PatternKind = "none" | "rings" | "fractal"

export const patternSteps: Step<PatternKind>[] = [
  { label: "None", value: "none", description: "plain background" },
  { label: "Rings", value: "rings", description: "dashed circular rings" },
  { label: "Fractal", value: "fractal", description: "fluted-glass fractal" },
]

/** How many dashed rings. */
export const ringCountSteps: Step<number>[] = [1, 2, 3, 4, 5, 6].map((count) => ({
  label: String(count),
  value: count,
  description: count === 1 ? "1 ring" : `${count} rings`,
}))

/** Space between rings, in canvas px. */
export const ringGapSteps: Step<number>[] = [
  { label: "Tight", value: 72, description: "rings close together" },
  { label: "Medium", value: 120, description: "even spacing" },
  { label: "Wide", value: 176, description: "rings far apart" },
]

/** How many vertical ribs run across the canvas. */
export const ribSteps: Step<number>[] = [
  { label: "Fine", value: 64, description: "many narrow ribs" },
  { label: "Medium", value: 40, description: "medium ribs" },
  { label: "Wide", value: 24, description: "few wide ribs" },
]

/**
 * How the ribs bend the colors behind them. Each step is clearly different:
 * `bend` is the sideways shift (canvas px), `waves` how many S-curves run
 * down the canvas, `stagger` how far each rib falls out of step with its
 * neighbour (radians), and `sheen` scales the glass highlight and shade.
 */
export type Wave = { bend: number; waves: number; stagger: number; sheen: number }

export const waveSteps: Step<Wave>[] = [
  { label: "Off", value: { bend: 0, waves: 1, stagger: 0.12, sheen: 1 }, description: "straight ribs" },
  { label: "Soft", value: { bend: 160, waves: 1.5, stagger: 0.4, sheen: 1.25 }, description: "gentle wave" },
  { label: "Strong", value: { bend: 340, waves: 2.5, stagger: 0.55, sheen: 1.6 }, description: "strong wave" },
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
  rings: 5,
  gap: 1,
  ribs: 1,
  wave: 1,
}

export function isDefaultBackgroundStyle(style: BackgroundStyle) {
  return patternSteps[style.pattern].value === "none"
}
