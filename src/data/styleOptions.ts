// Style controls are stepped, not continuous, so non-designers can't push a
// card to an extreme. The first step marked `isDefault` must leave the card
// exactly as templates.json places it.

export type Step<T> = { label: string; value: T; description: string }

export const sizeSteps: Step<number>[] = [
  { label: "XS", value: 0.8, description: "0.8×" },
  { label: "S", value: 0.9, description: "0.9×" },
  { label: "M", value: 1, description: "1.0×" },
  { label: "L", value: 1.1, description: "1.1×" },
  { label: "XL", value: 1.2, description: "1.2×" },
]

export const rotateSteps: Step<number>[] = [
  { label: "−10°", value: -10, description: "10° counter-clockwise" },
  { label: "−5°", value: -5, description: "5° counter-clockwise" },
  { label: "0°", value: 0, description: "as designed" },
  { label: "+5°", value: 5, description: "5° clockwise" },
  { label: "+10°", value: 10, description: "10° clockwise" },
]

/**
 * Simulated turn around the card's vertical axis, in degrees. Negative turns
 * the card to face left, positive to face right.
 */
export const tiltSteps: Step<number>[] = [
  { label: "−30°", value: -30, description: "strong turn to the left" },
  { label: "−15°", value: -15, description: "slight turn to the left" },
  { label: "Off", value: 0, description: "flat" },
  { label: "+15°", value: 15, description: "slight turn to the right" },
  { label: "+30°", value: 30, description: "strong turn to the right" },
]

/**
 * Border width in canvas px. A preset like the drop shadow: on or off per
 * frame, always the Mid width, in a color picked to suit the background.
 */
export const borderSteps: Step<number>[] = [
  { label: "Off", value: 0, description: "no border" },
  { label: "On", value: 8, description: "8 px, colored to suit the background" },
]

/** Drop shadow uses the color template's paired glow (see artworkPalette.ts). */
export const dropShadowSteps: Step<boolean>[] = [
  { label: "Off", value: false, description: "no shadow" },
  { label: "On", value: true, description: "glow from the color template" },
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
  size: 2,
  rotate: 2,
  tilt: 2,
  border: 0,
  dropShadow: 0,
}

/** Index of the step with exactly this value; throws if there is none. */
function stepIndex<T>(steps: Step<T>[], value: T, name: string) {
  const index = steps.findIndex((step) => step.value === value)
  if (index === -1) throw new Error(`templates.json: ${String(value)} is not a ${name} step`)
  return index
}

/**
 * A template card's starting style: the default, with the template's own
 * Size and 3D tilt steps when it sets them (Coverflow, Turned row). Users can
 * change them; Reset returns here.
 */
export function startStyleFor(templateCard: { size?: number; tilt?: number }): CardStyle {
  return {
    ...defaultCardStyle,
    size:
      templateCard.size === undefined
        ? defaultCardStyle.size
        : stepIndex(sizeSteps, templateCard.size, "Size"),
    tilt:
      templateCard.tilt === undefined
        ? defaultCardStyle.tilt
        : stepIndex(tiltSteps, templateCard.tilt, "3D tilt"),
  }
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
