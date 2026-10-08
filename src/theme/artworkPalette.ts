// Artwork colors: content painted into the exported thumbnail, not UI.
// This file and src/data/templates.json are the only places hex values are allowed.

/**
 * A color template pairs the canvas background with the drop-shadow glow color
 * from the same Gestalt hue ramp (see the colored-shadow pairs spec):
 * - light: background {hue}-50, glow {hue}-800, 11px spread
 * - deep: background {hue}-800, glow {hue}-50, 16px spread
 * Every glow is 25% opacity, 50px blur, no offset.
 */
export type ColorTemplate = {
  id: string
  name: string
  tone: "light" | "deep"
  background: string
  shadow: string
  spread: number
}

export const glow = { alpha: 0.25, blur: 50 } as const

const ramps: { id: string; name: string; light: string; deep: string }[] = [
  { id: "red", name: "Red", light: "#ffebeb", deep: "#800000" }, // red-pushpin-50 / 800
  { id: "pink", name: "Pink", light: "#ffebf1", deep: "#82053e" }, // pink-flaminglow
  { id: "blue", name: "Blue", light: "#e6f4ff", deep: "#003c96" }, // blue-skycicle
  { id: "teal", name: "Teal", light: "#e6faf5", deep: "#005062" }, // teal-spabattical
  { id: "green", name: "Green", light: "#e3fae1", deep: "#003020" }, // green-matchacado
  { id: "purple", name: "Purple", light: "#f0edff", deep: "#400387" }, // purple-mysticool
  { id: "orange", name: "Orange", light: "#fff0db", deep: "#842000" }, // orange-firetini
  { id: "yellow", name: "Yellow", light: "#fffebb", deep: "#7c2d00" }, // yellow-caramellow
  { id: "gray", name: "Gray", light: "#f9f9f9", deep: "#191919" }, // gray-roboflow
]

/** White (the Figma canvas color, white-mochimalist-0) with the neutral gray-roboflow-800 glow. */
export const whiteColorTemplate: ColorTemplate = {
  id: "white",
  name: "White",
  tone: "light",
  background: "#ffffff",
  shadow: "#191919",
  spread: 11,
}

export const colorTemplates: ColorTemplate[] = [
  whiteColorTemplate,
  ...ramps.map((ramp) => ({
    id: `${ramp.id}-light`,
    name: `${ramp.name} light`,
    tone: "light" as const,
    background: ramp.light,
    shadow: ramp.deep,
    spread: 11,
  })),
  ...ramps.map((ramp) => ({
    id: `${ramp.id}-deep`,
    name: `${ramp.name} deep`,
    tone: "deep" as const,
    background: ramp.deep,
    shadow: ramp.light,
    spread: 16,
  })),
]

export function findColorTemplate(id: string) {
  return colorTemplates.find((template) => template.id === id) ?? whiteColorTemplate
}

/** Fill behind the placeholder art in an empty card. */
export const placeholderFill = "#fff7f7"
/** Backing fill drawn behind a loaded image (visible only at the rounded edges). */
export const imageBackingFill = "#f1f0eb"

/** Frame stroke colors; pick with strokeColorFor() so it always contrasts the background. */
export const strokeOnLight = "#211922"
export const strokeOnDark = "#ffffff"

function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "")
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function strokeColorFor(background: string) {
  return luminance(background) < 0.18 ? strokeOnDark : strokeOnLight
}

/** Shadow color at a given opacity, for canvas shadowColor. */
export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
