import { canvas, card, type BleedSide, type Template } from "@/data/templates"
import {
  borderSteps,
  defaultCardStyle,
  rotateSteps,
  scatterSteps,
  dropShadowSteps,
  sizeSteps,
  tiltSteps,
  type CardStyle,
} from "@/data/styleOptions"

export type Offset = { x: number; y: number }

export type Placement = {
  slot: number
  z: number
  /** Center before the user's drag offset (template + scatter). */
  baseX: number
  baseY: number
  cx: number
  cy: number
  /** Degrees, clockwise positive. */
  rotate: number
  scale: number
  /** Simulated turn around the vertical axis, degrees (signed). */
  tilt: number
  style: CardStyle
}

export type Extent = { left: number; right: number; top: number; bottom: number }

export function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Where every card of a layout sits. With all styles at default, scatter off
 * and no offsets, this returns the template's JSON values unchanged.
 */
export function computePlacements({
  template,
  isEmptyState,
  styles,
  offsets,
  scatter,
  seed,
}: {
  template: Template
  isEmptyState: boolean
  styles: CardStyle[]
  offsets: Offset[]
  scatter: number
  seed: number
}): Placement[] {
  const jitter = scatterSteps[scatter].value
  return template.cards
    .map((templateCard, slot) => {
      const style = styles[slot]
      if (isEmptyState) {
        return {
          slot,
          z: templateCard.z,
          baseX: templateCard.cx,
          baseY: templateCard.cy,
          cx: templateCard.cx,
          cy: templateCard.cy,
          rotate: templateCard.rotate,
          scale: 1,
          tilt: 0,
          // The Empty State ignores every style control.
          style: defaultCardStyle,
        }
      }
      // Each slot gets its own stream so one card's jitter never shifts another's.
      const random = mulberry32(seed + (slot + 1) * 7919)
      const spread = () => random() * 2 - 1
      const baseX = templateCard.cx + spread() * jitter.offset
      const baseY = templateCard.cy + spread() * jitter.offset
      const rotate =
        templateCard.rotate +
        rotateSteps[style.rotate].value +
        spread() * jitter.rotate
      const scale = sizeSteps[style.size].value * (1 + spread() * jitter.size)
      // Cards turn toward the canvas center, so a tilted layout reads as a set.
      const towardCenter = templateCard.cx <= canvas.width / 2 ? 1 : -1
      const offset = offsets[slot]
      return {
        slot,
        z: templateCard.z,
        baseX,
        baseY,
        cx: baseX + offset.x,
        cy: baseY + offset.y,
        rotate,
        scale,
        tilt: tiltSteps[style.tilt].value * towardCenter,
        style,
      }
    })
    .sort((a, b) => a.z - b.z)
}

/** Linear part of the card transform: rotate · tilt · scale, as [a, b, c, d]. */
function linearTransform(placement: Placement): [number, number, number, number] {
  const theta = (placement.rotate * Math.PI) / 180
  const turn = (placement.tilt * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  // Tilt: compress horizontally and shear vertically, like a card turning in 3D.
  const ta = Math.cos(turn)
  const tb = Math.sin(turn) * 0.2
  const s = placement.scale
  // R · T, then scale.
  return [
    (cos * ta - sin * tb) * s,
    (sin * ta + cos * tb) * s,
    -sin * s,
    cos * s,
  ]
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
  // On a bleed side the card may run off the canvas, but its center stays on it.
  const lower = bleedMin ? 0 : margin - relMin
  const upper = bleedMax ? size : size - margin - relMax
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
