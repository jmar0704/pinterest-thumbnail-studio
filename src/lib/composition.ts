import { canvas, card, type BleedSide, type Template } from "@/data/templates"
import {
  borderSteps,
  rotateSteps,
  dropShadowSteps,
  sizeSteps,
  tiltSteps,
  type CardStyle,
} from "@/data/styleOptions"

export type Offset = { x: number; y: number }

export type Placement = {
  slot: number
  z: number
  /** Center before the user's drag offset (the template's position). */
  baseX: number
  baseY: number
  cx: number
  cy: number
  /** Degrees, clockwise positive. */
  rotate: number
  scale: number
  /** True when the template fixes this card's size (Size control locked). */
  sizeLocked: boolean
  /** Simulated turn around the vertical axis, degrees (signed). */
  tilt: number
  style: CardStyle
}

export type Extent = { left: number; right: number; top: number; bottom: number }

/**
 * Where every card of a layout sits. With all styles at default and no
 * offsets, this returns the template's JSON values unchanged.
 */
export function computePlacements({
  template,
  styles,
  offsets,
}: {
  template: Template
  styles: CardStyle[]
  offsets: Offset[]
}): Placement[] {
  return template.cards
    .map((templateCard, slot) => {
      const style = styles[slot]
      const offset = offsets[slot]
      return {
        slot,
        z: templateCard.z,
        baseX: templateCard.cx,
        baseY: templateCard.cy,
        cx: templateCard.cx + offset.x,
        cy: templateCard.cy + offset.y,
        rotate: templateCard.rotate + rotateSteps[style.rotate].value,
        // A fixed template scale (Showcase's back card) overrides the Size step.
        scale: templateCard.scale ?? sizeSteps[style.size].value,
        sizeLocked: templateCard.scale !== undefined,
        tilt: tiltSteps[style.tilt].value,
        style,
      }
    })
    .sort((a, b) => a.z - b.z)
}

/** Linear part of the card transform: rotate · tilt · scale, as [a, b, c, d]. */
function linearTransform(placement: Placement): [number, number, number, number] {
  return cardLinearTransform(placement.rotate, placement.tilt, placement.scale)
}

/** rotate · tilt · scale as [a, b, c, d]; also used by the picker thumbnails. */
export function cardLinearTransform(
  rotate: number,
  tilt: number,
  scale: number,
): [number, number, number, number] {
  const theta = (rotate * Math.PI) / 180
  const turn = (tilt * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  // Tilt: compress horizontally and shear vertically, like a card turning in 3D.
  const ta = Math.cos(turn)
  const tb = Math.sin(turn) * 0.2
  const s = scale
  // R · T, then scale.
  return [
    (cos * ta - sin * tb) * s,
    (sin * ta + cos * tb) * s,
    -sin * s,
    cos * s,
  ]
}

/** The full card transform as a canvas matrix [a, b, c, d, e, f]. */
export function cardMatrix(placement: Placement): [number, number, number, number, number, number] {
  const [a, b, c, d] = linearTransform(placement)
  return [a, b, c, d, placement.cx, placement.cy]
}

export function applyCardTransform(
  context: CanvasRenderingContext2D,
  placement: Placement,
) {
  const [a, b, c, d] = linearTransform(placement)
  context.transform(a, b, c, d, placement.cx, placement.cy)
}

/** Canvas-space bounds of a card's rounded rectangle, relative to its center. */
function relativeExtent(placement: Placement): Extent {
  const [a, b, c, d] = linearTransform(placement)
  const r = card.cornerRadius
  const hw = card.width / 2 - r
  const hh = card.height / 2 - r
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => [a * x + c * y, b * x + d * y])
  const pad = r * placement.scale
  return {
    left: Math.min(...corners.map(([x]) => x)) - pad,
    right: Math.max(...corners.map(([x]) => x)) + pad,
    top: Math.min(...corners.map(([, y]) => y)) - pad,
    bottom: Math.max(...corners.map(([, y]) => y)) + pad,
  }
}

export function extentOf(placement: Placement): Extent {
  const rel = relativeExtent(placement)
  return {
    left: placement.cx + rel.left,
    right: placement.cx + rel.right,
    top: placement.cy + rel.top,
    bottom: placement.cy + rel.bottom,
  }
}

function clampAxis(
  value: number,
  relMin: number,
  relMax: number,
  size: number,
  bleedMin: boolean,
  bleedMax: boolean,
) {
  const margin = canvas.margin
  // On a bleed side the card may run off the canvas, but at least a margin's
  // width of it stays visible so it can be grabbed again.
  const lower = bleedMin ? margin - relMax : margin - relMin
  const upper = bleedMax ? size - margin - relMin : size - margin - relMax
  if (lower > upper) return (lower + upper) / 2
  return Math.min(upper, Math.max(lower, value))
}

/**
 * Clamp a drag offset so the card stays inside the 48px margin on every side
 * the template doesn't allow to bleed.
 */
export function clampOffset(
  placement: Placement,
  offset: Offset,
  allowBleed: BleedSide[],
): Offset {
  const rel = relativeExtent(placement)
  const cx = clampAxis(
    placement.baseX + offset.x,
    rel.left,
    rel.right,
    canvas.width,
    allowBleed.includes("left"),
    allowBleed.includes("right"),
  )
  const cy = clampAxis(
    placement.baseY + offset.y,
    rel.top,
    rel.bottom,
    canvas.height,
    allowBleed.includes("top"),
    allowBleed.includes("bottom"),
  )
  return { x: cx - placement.baseX, y: cy - placement.baseY }
}

/** Sides on which a card crosses the margin without the template allowing it. */
export function marginViolations(
  placement: Placement,
  allowBleed: BleedSide[],
): BleedSide[] {
  const extent = extentOf(placement)
  const margin = canvas.margin
  const tolerance = 0.5
  const sides: BleedSide[] = []
  if (!allowBleed.includes("left") && extent.left < margin - tolerance) sides.push("left")
  if (!allowBleed.includes("right") && extent.right > canvas.width - margin + tolerance)
    sides.push("right")
  if (!allowBleed.includes("top") && extent.top < margin - tolerance) sides.push("top")
  if (!allowBleed.includes("bottom") && extent.bottom > canvas.height - margin + tolerance)
    sides.push("bottom")
  return sides
}

/** Topmost card under a canvas-space point, accounting for rotation and tilt. */
export function hitTest(placements: Placement[], x: number, y: number) {
  for (let i = placements.length - 1; i >= 0; i -= 1) {
    const placement = placements[i]
    const [a, b, c, d] = linearTransform(placement)
    const det = a * d - b * c
    const dx = x - placement.cx
    const dy = y - placement.cy
    const localX = (d * dx - c * dy) / det
    const localY = (-b * dx + a * dy) / det
    if (Math.abs(localX) <= card.width / 2 && Math.abs(localY) <= card.height / 2) {
      return placement
    }
  }
  return null
}

export function hasDropShadow(style: CardStyle) {
  return dropShadowSteps[style.dropShadow].value
}

export function borderFor(style: CardStyle) {
  return borderSteps[style.border].value
}

// ---- Selection handles and symmetry --------------------------------------

/** A card-space point (origin at the card center) in canvas coordinates. */
export function toCanvas(placement: Placement, x: number, y: number) {
  const [a, b, c, d] = linearTransform(placement)
  return { x: placement.cx + a * x + c * y, y: placement.cy + b * x + d * y }
}

/** The card's four corners in canvas coordinates (top-left, clockwise). */
export function cardCorners(placement: Placement) {
  const hw = card.width / 2
  const hh = card.height / 2
  return [
    toCanvas(placement, -hw, -hh),
    toCanvas(placement, hw, -hh),
    toCanvas(placement, hw, hh),
    toCanvas(placement, -hw, hh),
  ]
}

/**
 * The rotation handle: a point `distance` canvas px above the card's top edge
 * (along the card's own "up"), plus the top-center point it hangs from.
 */
export function rotationHandle(placement: Placement, distance: number) {
  const top = toCanvas(placement, 0, -card.height / 2)
  const theta = (placement.rotate * Math.PI) / 180
  return {
    anchor: top,
    handle: { x: top.x + Math.sin(theta) * distance, y: top.y - Math.cos(theta) * distance },
  }
}

/** Index of the step whose value is closest to `target`. */
export function nearestStep(values: number[], target: number) {
  let best = 0
  values.forEach((value, index) => {
    if (Math.abs(value - target) < Math.abs(values[best] - target)) best = index
  })
  return best
}

/** Size step for a corner dragged to `point`: scale ∝ distance from center. */
export function sizeStepFor(placement: Placement, point: { x: number; y: number }) {
  const unit = Math.hypot(card.width / 2, card.height / 2)
  const scale = Math.hypot(point.x - placement.cx, point.y - placement.cy) / unit
  return nearestStep(
    sizeSteps.map((step) => step.value),
    scale,
  )
}

/** Rotate step for the rotation handle dragged to `point`. */
export function rotateStepFor(
  placement: Placement,
  templateRotate: number,
  point: { x: number; y: number },
) {
  const angle =
    (Math.atan2(point.x - placement.cx, -(point.y - placement.cy)) * 180) / Math.PI
  // Normalize the offset from the template's rotation to (-180, 180].
  const offset = ((angle - templateRotate + 540) % 360) - 180
  return nearestStep(
    rotateSteps.map((step) => step.value),
    offset,
  )
}

/** How close (canvas px) a card's center must be to a center line to snap. */
export const symmetrySnap = 12

/**
 * Snap a card's center onto the canvas's vertical and/or horizontal center
 * line when it comes within `symmetrySnap`, so frames can be centered by hand.
 */
export function snapToSymmetry(cx: number, cy: number) {
  const midX = canvas.width / 2
  const midY = canvas.height / 2
  const vertical = Math.abs(cx - midX) <= symmetrySnap
  const horizontal = Math.abs(cy - midY) <= symmetrySnap
  return {
    cx: vertical ? midX : cx,
    cy: horizontal ? midY : cy,
    guides: { vertical, horizontal },
  }
}
