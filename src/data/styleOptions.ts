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

/**
 * Simulated turn around the card's vertical axis, in degrees. Negative turns
 * the card to face left, positive to face right.
 */
export const tiltSteps: Step<number>[] = [
  { label: "−30°", value: -30, description: "Strong turn to the left" },
  { label: "−15°", value: -15, description: "Slight turn to the left" },
  { label: "Off", value: 0, description: "Flat" },
  { label: "+15°", value: 15, description: "Slight turn to the right" },
  { label: "+30°", value: 30, description: "Strong turn to the right" },
]

/** Border width in canvas px. */
export const borderSteps: Step<number>[] = [
  { label: "None", value: 0, description: "No border" },
  { label: "Thin", value: 4, description: "4 px" },
  { label: "Mid", value: 8, description: "8 px" },
  { label: "Thick", value: 12, description: "12 px" },
]

/** Drop shadow uses the color template's paired glow (see artworkPalette.ts). */
export const dropShadowSteps: Step<boolean>[] = [
  { label: "Off", value: false, description: "No shadow" },
  { label: "On", value: true, description: "Glow from the color template" },
]

/** Per-card style, stored as step indexes into the arrays above. */
export type CardStyle = {
  size: number
  rotate: number
  tilt: number
  border: number
  dropShadow: number
}

export const defaultCardStyle: CardStyle = {
  size: 1,
  rotate: 2,
  tilt: 2,
  border: 0,
  dropShadow: 0,
}

/** Whether a card's style still matches its template's starting style. */
export function isDefaultStyle(style: CardStyle, start: CardStyle = defaultCardStyle) {
  return (
    style.size === start.size &&
    style.rotate === start.rotate &&
    style.tilt === start.tilt &&
    style.border === start.border &&
    style.dropShadow === start.dropShadow
  )
}
