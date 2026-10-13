// Low edge contrast check: does an image's visible OUTER EDGE blend into the
// background right outside it? A design-quality check, not a compliance
// claim (WCAG 1.4.11 exempts photos). Pure functions; no React, no app state.

export type Side = "top" | "right" | "bottom" | "left"
export const SIDES: readonly Side[] = ["top", "right", "bottom", "left"]

/** Below this ratio on any side => show a warning. */
export const WARN_RATIO = 2
/** WCAG 1.4.11 benchmark. Computed and returned, but not shown in the UI yet. */
export const HINT_RATIO = 3
/** Flip to surface the 2:1–3:1 "hint" level in the UI (see BACKLOG.md). */
export const SHOW_HINT_LEVEL = false

export type ContrastLevel = "ok" | "hint" | "warn"
export type RGB = readonly [number, number, number]

export type Rect = { x: number; y: number; w: number; h: number }

/** Source crop actually drawn, in the image's intrinsic pixels. */
export type Crop = { sx: number; sy: number; sw: number; sh: number }

export type SideContrast = {
  ratio: number
  edgeLuminance: number
  backgroundLuminance: number
}

export type EdgeContrastResult = {
  sides: Partial<Record<Side, SideContrast>>
  weakSides: Side[]
  worstSide: Side | null
  worstRatio: number | null
  level: ContrastLevel
}

export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas
type AnyContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const srgbToLinear = new Float32Array(256)
for (let i = 0; i < 256; i += 1) {
  const c = i / 255
  srgbToLinear[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const to8bit = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

/** WCAG relative luminance of an sRGB color (0–255 channels). */
export function relativeLuminance(r: number, g: number, b: number) {
  return (
    0.2126 * srgbToLinear[to8bit(r)] +
    0.7152 * srgbToLinear[to8bit(g)] +
    0.0722 * srgbToLinear[to8bit(b)]
  )
}

/** WCAG contrast ratio between two relative luminances. */
export function contrastRatio(a: number, b: number) {
  const high = Math.max(a, b)
  const low = Math.min(a, b)
  return (high + 0.05) / (low + 0.05)
}

export function levelFor(ratio: number | null): ContrastLevel {
  if (ratio === null) return "ok"
  if (ratio < WARN_RATIO) return "warn"
  return ratio < HINT_RATIO ? "hint" : "ok"
}

function get2d(canvas: AnyCanvas): AnyContext | null {
  return canvas.getContext("2d", { willReadFrequently: true }) as AnyContext | null
}

function intrinsicSize(source: ImageSource) {
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth, h: source.naturalHeight }
  }
  return { w: source.width, h: source.height }
}

/**
 * Average RGB of the band of background just OUTSIDE each side of `rect`.
 * `background` must be a background-only render in the same pixel space as
 * `rect`. A side is omitted when most of its band has no background beside
 * it: off the canvas, or transparent (outside the thumbnail after the card
 * reprojection) — i.e. the image touches the canvas edge there.
 */
export function sampleBackgroundSides(
  background: AnyCanvas,
  rect: Rect,
  band = 6,
  gap = 1,
): Partial<Record<Side, RGB>> {
  const context = get2d(background)
  if (!context) return {}
  const { width, height } = background

  const strips: Record<Side, Rect> = {
    top: { x: rect.x, y: rect.y - gap - band, w: rect.w, h: band },
    bottom: { x: rect.x, y: rect.y + rect.h + gap, w: rect.w, h: band },
    left: { x: rect.x - gap - band, y: rect.y, w: band, h: rect.h },
    right: { x: rect.x + rect.w + gap, y: rect.y, w: band, h: rect.h },
  }

  const out: Partial<Record<Side, RGB>> = {}
  for (const side of SIDES) {
    const strip = strips[side]
    const x0 = Math.max(0, Math.floor(strip.x))
    const y0 = Math.max(0, Math.floor(strip.y))
    const x1 = Math.min(width, Math.ceil(strip.x + strip.w))
    const y1 = Math.min(height, Math.ceil(strip.y + strip.h))
    const w = x1 - x0
    const h = y1 - y0
    if (w <= 0 || h <= 0) continue
    const area = Math.max(1, strip.w * strip.h)

    let data: Uint8ClampedArray
    try {
      data = context.getImageData(x0, y0, w, h).data
    } catch {
      continue // tainted canvas
    }
    let r = 0
    let g = 0
    let b = 0
    let covered = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      covered += 1
    }
    // Mostly off-canvas or transparent: no background beside this side.
    if (covered / area < 0.5) continue
    out[side] = [r / covered, g / covered, b / covered]
  }
  return out
}

/**
 * Average luminance per side of the VISIBLE image edge, compositing
 * semi-transparent pixels over that side's background. Mostly transparent
 * sides are skipped (cutout silhouettes; see BACKLOG.md). `cornerRadius` is a
 * fraction of the drawn width; pixels inside rounded corners aren't visible,
 * so they're left out of each side's strip.
 */
export function sampleImageEdgeLuminance(
  source: ImageSource,
  backgroundSides: Partial<Record<Side, RGB>>,
  crop?: Crop,
  options: { maxSize?: number; minCoverage?: number; cornerRadius?: number } = {},
): Partial<Record<Side, number>> {
  const { maxSize = 64, minCoverage = 0.2, cornerRadius = 0 } = options
  const full = intrinsicSize(source)
  if (full.w === 0 || full.h === 0) return {}
  const c: Crop = crop ?? { sx: 0, sy: 0, sw: full.w, sh: full.h }

  const scale = Math.min(1, maxSize / Math.max(c.sw, c.sh))
  const w = Math.max(4, Math.round(c.sw * scale))
  const h = Math.max(4, Math.round(c.sh * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return {}
  context.drawImage(source, c.sx, c.sy, c.sw, c.sh, 0, 0, w, h)

  let data: Uint8ClampedArray
  try {
    data = context.getImageData(0, 0, w, h).data
  } catch {
    return {}
  }
  return edgeLuminanceFromPixels(data, w, h, backgroundSides, { minCoverage, cornerRadius })
}

/**
 * The pixel math behind sampleImageEdgeLuminance, separated so it can be
 * checked with plain arrays. `data` is RGBA, row-major, `w`×`h`.
 */
export function edgeLuminanceFromPixels(
  data: ArrayLike<number>,
  w: number,
  h: number,
  backgroundSides: Partial<Record<Side, RGB>>,
  options: { minCoverage?: number; cornerRadius?: number } = {},
): Partial<Record<Side, number>> {
  const { minCoverage = 0.2, cornerRadius = 0 } = options
  const strip = Math.max(2, Math.round(Math.min(w, h) * 0.06))
  const corner = Math.round(cornerRadius * w)
  const sum: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 }
  const opaque: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 }
  const total: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 }

  const visit = (side: Side, x: number, y: number) => {
    const background = backgroundSides[side]
    if (!background) return
    const i = (y * w + x) * 4
    const alpha = data[i + 3] / 255
    total[side] += 1
    if (alpha < 0.02) return
    const r = data[i] * alpha + background[0] * (1 - alpha)
    const g = data[i + 1] * alpha + background[1] * (1 - alpha)
    const b = data[i + 2] * alpha + background[2] * (1 - alpha)
    sum[side] += relativeLuminance(r, g, b)
    opaque[side] += 1
  }

  const xStart = Math.max(corner, 0)
  const xEnd = Math.min(w - corner, w)
  const yStart = Math.max(strip, corner)
  const yEnd = Math.min(h - strip, h - corner)
  for (let y = 0; y < strip; y += 1) for (let x = xStart; x < xEnd; x += 1) visit("top", x, y)
  for (let y = h - strip; y < h; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) visit("bottom", x, y)
  }
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = 0; x < strip; x += 1) visit("left", x, y)
    for (let x = w - strip; x < w; x += 1) visit("right", x, y)
  }

  const out: Partial<Record<Side, number>> = {}
  for (const side of SIDES) {
    if (total[side] === 0) continue
    if (opaque[side] / total[side] < minCoverage) continue
    out[side] = sum[side] / opaque[side]
  }
  return out
}

/** Combine per-side edge and background samples into a result. */
export function compareSides(
  backgroundSides: Partial<Record<Side, RGB>>,
  edgeLuminance: Partial<Record<Side, number>>,
): EdgeContrastResult {
  const sides: Partial<Record<Side, SideContrast>> = {}
  let worstSide: Side | null = null
  let worstRatio: number | null = null

  for (const side of SIDES) {
    const background = backgroundSides[side]
    const edge = edgeLuminance[side]
    if (!background || edge === undefined) continue
    const backgroundLuminance = relativeLuminance(background[0], background[1], background[2])
    const ratio = contrastRatio(edge, backgroundLuminance)
    sides[side] = { ratio, edgeLuminance: edge, backgroundLuminance }
    if (worstRatio === null || ratio < worstRatio) {
      worstRatio = ratio
      worstSide = side
    }
  }

  const weakSides = SIDES.filter((side) => (sides[side]?.ratio ?? Infinity) < WARN_RATIO)
  return { sides, weakSides, worstSide, worstRatio, level: levelFor(worstRatio) }
}

export type EvaluateInput = {
  image: ImageSource
  /** Background-only render, in the same pixel space as `rect`. */
  backgroundCanvas: AnyCanvas
  /** Where the image's visible rect sits, in backgroundCanvas pixels. */
  rect: Rect
  crop?: Crop
  /** Fraction of the drawn width taken by each rounded corner. */
  cornerRadius?: number
  /** If a frame border is drawn, its color is the visible edge, not the pixels. */
  edgeColorOverride?: RGB
}

export function evaluateEdgeContrast(input: EvaluateInput): EdgeContrastResult {
  const backgroundSides = sampleBackgroundSides(input.backgroundCanvas, input.rect)

  let edgeLuminance: Partial<Record<Side, number>> = {}
  if (input.edgeColorOverride) {
    const [r, g, b] = input.edgeColorOverride
    const luminance = relativeLuminance(r, g, b)
    for (const side of SIDES) if (backgroundSides[side]) edgeLuminance[side] = luminance
  } else {
    edgeLuminance = sampleImageEdgeLuminance(input.image, backgroundSides, input.crop, {
      cornerRadius: input.cornerRadius,
    })
  }
  return compareSides(backgroundSides, edgeLuminance)
}

/** "top edge", "top and left edges", "top, right and bottom edges", "edges". */
export function describeSides(sides: Side[]) {
  if (sides.length === 4) return "edges"
  if (sides.length === 1) return `${sides[0]} edge`
  return `${sides.slice(0, -1).join(", ")} and ${sides[sides.length - 1]} edges`
}
