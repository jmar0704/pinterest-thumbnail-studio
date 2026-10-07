import { shadowColorOptions } from "@/theme/artworkPalette"

// Style controls are stepped, not continuous, so non-designers can't push a
// card to an extreme. The first step marked `isDefault` must leave the card
// exactly as templates.json places it.

export type Step<T> = { label: string; value: T; description: string }

export const sizeSteps: Step<number>[] = [
  { label: "S", value: 0.9, description: "0.9×" },
  { label: "M", value: 1, description: "1.0× (as designed)" },
  { label: "L", value: 1.1, description: "1.1×" },
  { label: "XL", value: 1.2, description: "1.2×" },
]

export const rotateSteps: Step<number>[] = [
  { label: "−10°", value: -10, description: "10° counter-clockwise" },
  { label: "−5°", value: -5, description: "5° counter-clockwise" },
  { label: "0°", value: 0, description: "As designed" },
  { label: "+5°", value: 5, description: "5° clockwise" },
  { label: "+10°", value: 10, description: "10° clockwise" },
]

/** Simulated turn around the card's vertical axis, in degrees. */
export const tiltSteps: Step<number>[] = [
  { label: "Off", value: 0, description: "Flat" },
  { label: "Subtle", value: 15, description: "Slight 3D turn" },
  { label: "Strong", value: 30, description: "Pronounced 3D turn" },
]

/** Border width in canvas px. */
export const borderSteps: Step<number>[] = [
  { label: "None", value: 0, description: "No border" },
  { label: "Thin", value: 4, description: "4 px" },
  { label: "Mid", value: 8, description: "8 px" },
  { label: "Thick", value: 12, description: "12 px" },
]

export type ShadowLevel = { blur: number; offsetY: number; alpha: number }

export const shadowSteps: Step<ShadowLevel | null>[] = [
  { label: "None", value: null, description: "No shadow" },
  { label: "Soft", value: { blur: 24, offsetY: 8, alpha: 0.2 }, description: "Soft" },
  { label: "Mid", value: { blur: 40, offsetY: 16, alpha: 0.3 }, description: "Medium" },
  { label: "Strong", value: { blur: 64, offsetY: 28, alpha: 0.4 }, description: "Strong" },
]

/** Composition-wide seeded randomness. Shuffle re-rolls it. */
export type ScatterLevel = { offset: number; rotate: number; size: number }

export const scatterSteps: Step<ScatterLevel>[] = [
  { label: "Off", value: { offset: 0, rotate: 0, size: 0 }, description: "Cards sit exactly as designed" },
  { label: "Subtle", value: { offset: 24, rotate: 4, size: 0.04 }, description: "A little hand-placed variation" },
  { label: "Playful", value: { offset: 56, rotate: 9, size: 0.08 }, description: "Loose, collage-like variation" },
]

/** Per-card style, stored as step indexes into the arrays above. */
export type CardStyle = {
  size: number
  rotate: number
  tilt: number
  border: number
  shadow: number
  shadowColor: string
}

export const defaultCardStyle: CardStyle = {
  size: 1,
  rotate: 2,
  tilt: 0,
  border: 0,
  shadow: 0,
  shadowColor: shadowColorOptions[0].value,
}

export const defaultScatter = 0

export function isDefaultStyle(style: CardStyle) {
  return (
    style.size === defaultCardStyle.size &&
    style.rotate === defaultCardStyle.rotate &&
    style.tilt === defaultCardStyle.tilt &&
    style.border === defaultCardStyle.border &&
    style.shadow === defaultCardStyle.shadow
  )
}
