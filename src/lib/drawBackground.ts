import { canvas } from "@/data/templates"
import {
  patternSteps,
  ribSteps,
  ringCountSteps,
  ringGapSteps,
  waveSteps,
  type BackgroundStyle,
} from "@/data/backgroundOptions"
import {
  ribHighlight,
  ribShade,
  withAlpha,
  type ColorTemplate,
} from "@/theme/artworkPalette"

/**
 * Pattern ink: the color template's paired glow color, softened. Light
 * backgrounds get their deep partner, deep backgrounds their light partner,
 * so patterns always match the chosen colors.
 */
function inkFor(colors: ColorTemplate, alpha: number) {
  return withAlpha(colors.shadow, alpha)
}

/** Ring sizes: the innermost ring's half-height, and width-to-height ratio. */
const ringBase = { radiusY: 220, aspect: 1.45, lineWidth: 4, dash: [20, 16] }

/** Concentric dashed ellipses centered on the canvas. */
function drawRings(context: CanvasRenderingContext2D, colors: ColorTemplate, style: BackgroundStyle) {
  const count = ringCountSteps[style.rings].value
  const gap = ringGapSteps[style.gap].value
  context.save()
  context.strokeStyle = inkFor(colors, colors.tone === "light" ? 0.35 : 0.5)
  context.lineWidth = ringBase.lineWidth
  context.setLineDash(ringBase.dash)
  context.lineCap = "round"
  for (let ring = 0; ring < count; ring += 1) {
    const radiusY = ringBase.radiusY + ring * gap
    context.beginPath()
    context.ellipse(
      canvas.width / 2,
      canvas.height / 2,
      radiusY * ringBase.aspect,
      radiusY,
      0,
      0,
      Math.PI * 2,
    )
    context.stroke()
  }
  context.restore()
}

const rippleCache = new Map<string, HTMLCanvasElement>()

function makeCanvas() {
  const layer = document.createElement("canvas")
  layer.width = canvas.width
  layer.height = canvas.height
  return layer
}

/**
 * The color fields the ribs bend: a deep side and a light side with a soft
 * boundary down the middle (that boundary is what reads as the ripple), plus
 * a couple of pools so the surface isn't flat.
 */
function paintColorFields(context: CanvasRenderingContext2D, colors: ColorTemplate) {
  const { width, height } = canvas
  context.fillStyle = colors.background
  context.fillRect(0, 0, width, height)

  const split = context.createLinearGradient(width * 0.3, 0, width * 0.6, 0)
  split.addColorStop(0, inkFor(colors, 0.9))
  split.addColorStop(0.55, inkFor(colors, 0.55))
  split.addColorStop(1, inkFor(colors, 0))
  context.fillStyle = split
  context.fillRect(0, 0, width, height)

  const pool = (x: number, y: number, radius: number, color: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, withAlpha(colors.background, 0))
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  pool(width * 0.15, height * 0.1, width * 0.3, withAlpha(colors.background, 0.7))
  pool(width * 0.8, height * 0.45, width * 0.35, withAlpha(colors.background, 0.9))
  pool(width * 0.85, height * 0.95, width * 0.3, inkFor(colors, 0.7))
}

/**
 * Fluted glass: the color fields seen through vertical ribs. Each rib shows a
 * slightly wider strip of the fields squeezed into its width (refraction),
 * shifted sideways along a wave, then gets a highlight-to-shade sheen.
 */
function renderRipples(colors: ColorTemplate, style: BackgroundStyle) {
  const ribs = ribSteps[style.ribs].value
  const wave = waveSteps[style.wave].value
  const key = [colors.id, ribs, wave].join("|")
  const cached = rippleCache.get(key)
  if (cached) return cached

  const fields = makeCanvas()
  paintColorFields(fields.getContext("2d")!, colors)

  const output = makeCanvas()
  const context = output.getContext("2d")!
  const { width, height } = canvas
  const ribWidth = width / ribs
  const sliceHeight = 12
  for (let rib = 0; rib < ribs; rib += 1) {
    const x = rib * ribWidth
    for (let y = 0; y < height; y += sliceHeight) {
      // One S-curve down the canvas, phase-shifted per rib.
      const shift = wave * Math.sin((y / height) * Math.PI * 2 + rib * 0.12)
      const sourceX = Math.min(Math.max(x + shift - ribWidth * 0.25, 0), width - ribWidth * 1.5)
      context.drawImage(
        fields,
        sourceX,
        y,
        ribWidth * 1.5,
        sliceHeight,
        x,
        y,
        ribWidth + 0.5,
        sliceHeight,
      )
    }
    const sheen = context.createLinearGradient(x, 0, x + ribWidth, 0)
    sheen.addColorStop(0, withAlpha(ribHighlight, 0.22))
    sheen.addColorStop(0.45, withAlpha(ribHighlight, 0))
    sheen.addColorStop(1, withAlpha(ribShade, 0.16))
    context.fillStyle = sheen
    context.fillRect(x, 0, ribWidth + 0.5, height)
  }
  rippleCache.set(key, output)
  return output
}

/** Paints the chosen pattern over the background color, behind the frames. */
export function drawBackgroundPattern(
  context: CanvasRenderingContext2D,
  colors: ColorTemplate,
  style: BackgroundStyle,
) {
  const pattern = patternSteps[style.pattern].value
  if (pattern === "rings") drawRings(context, colors, style)
  if (pattern === "ripples") context.drawImage(renderRipples(colors, style), 0, 0)
}
