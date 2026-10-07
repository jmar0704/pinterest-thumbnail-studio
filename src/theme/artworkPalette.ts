// Artwork colors: content painted into the exported thumbnail, not UI.
// This file and src/data/templates.json are the only places hex values are allowed.

export type ArtworkColor = { name: string; value: string }

export const backgroundOptions: ArtworkColor[] = [
  { name: "Off-white", value: "#fbfbf9" },
  { name: "Stone", value: "#e5e5e0" },
  { name: "White", value: "#ffffff" },
  { name: "Sage", value: "#c7d9c4" },
  { name: "Plum", value: "#211922" },
]

export const shadowColorOptions: ArtworkColor[] = [
  { name: "Plum", value: "#211922" },
  { name: "Umber", value: "#6e5d51" },
  { name: "Rose", value: "#a13c4c" },
  { name: "Fern", value: "#486a55" },
  { name: "Slate", value: "#526b8a" },
]

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
