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

/** Ring sizes: the innermost ring's radius. Rings are true circles. */
const ringBase = { radius: 220, lineWidth: 4, dash: [20, 16] }

/**
 * Options for small previews: `strokeScale` thickens ring lines and dashes so
 * they stay visible when the whole canvas is drawn at thumbnail size.
 */
export type PatternDrawOptions = { strokeScale?: number }

/** Concentric dashed circles centered on the canvas. */
function drawRings(
  context: CanvasRenderingContext2D,
  colors: ColorTemplate,
  style: BackgroundStyle,
  { strokeScale = 1 }: PatternDrawOptions,
) {
  const count = ringCountSteps[style.rings].value
  const gap = ringGapSteps[style.gap].value
  context.save()
  context.strokeStyle = inkFor(colors, colors.tone === "light" ? 0.35 : 0.5)
  context.lineWidth = ringBase.lineWidth * strokeScale
  context.setLineDash(ringBase.dash.map((length) => length * strokeScale))
  context.lineCap = "round"
  for (let ring = 0; ring < count; ring += 1) {
    const radius = ringBase.radius + ring * gap
    context.beginPath()
    context.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

const fractalCache = new Map<string, HTMLCanvasElement>()

function makeCanvas() {
  const layer = document.createElement("canvas")
  layer.width = canvas.width
  layer.height = canvas.height
  return layer
}

/**
 * The color fields the ribs bend. The chosen background color dominates;
 * its paired color only accents it, plus a shade and a highlight. So a
 * light background stays light (Red light reads pink) and a deep one stays
 * deep (Red deep reads dark red). The soft boundary down the middle is what
 * reads as the ripple once the ribs bend it.
 */
function paintColorFields(context: CanvasRenderingContext2D, colors: ColorTemplate) {
  const { width, height } = canvas
  const light = colors.tone === "light"
  const accent = inkFor(colors, light ? 0.38 : 0.3)
  const shade = withAlpha(ribShade, light ? 0.1 : 0.38)
  const highlight = withAlpha(ribHighlight, light ? 0.6 : 0.14)

  context.fillStyle = colors.background
  context.fillRect(0, 0, width, height)

  const split = context.createLinearGradient(width * 0.3, 0, width * 0.62, 0)
  split.addColorStop(0, accent)
  split.addColorStop(1, withAlpha(colors.background, 0))
  context.fillStyle = split
  context.fillRect(0, 0, width, height)

  const pool = (x: number, y: number, radius: number, color: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, withAlpha(colors.background, 0))
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  pool(width * 0.2, height * 0.75, width * 0.4, shade)
  pool(width * 0.78, height * 0.35, width * 0.4, highlight)
  pool(width * 0.9, height * 0.95, width * 0.3, accent)
}

/**
 * Fluted glass: the color fields seen through vertical ribs. Each rib shows a
 * slightly wider strip of the fields squeezed into its width (refraction),
 * shifted sideways along a wave, then gets a highlight-to-shade sheen.
 */
function renderFractal(colors: ColorTemplate, style: BackgroundStyle) {
  const ribs = ribSteps[style.ribs].value
  const wave = waveSteps[style.wave].value
  const key = [colors.id, ribs, style.wave].join("|")
  const cached = fractalCache.get(key)
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
      // S-curves down the canvas, each rib a little out of step.
      const shift =
        wave.bend * Math.sin((y / height) * Math.PI * 2 * wave.waves + rib * wave.stagger)
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
    sheen.addColorStop(0, withAlpha(ribHighlight, 0.22 * wave.sheen))
    sheen.addColorStop(0.45, withAlpha(ribHighlight, 0))
    sheen.addColorStop(1, withAlpha(ribShade, 0.16 * wave.sheen))
    context.fillStyle = sheen
    context.fillRect(x, 0, ribWidth + 0.5, height)
  }
  fractalCache.set(key, output)
  return output
}

/** Paints the chosen pattern over the background color, behind the frames. */
export function drawBackgroundPattern(
  context: CanvasRenderingContext2D,
  colors: ColorTemplate,
  style: BackgroundStyle,
  options: PatternDrawOptions = {},
) {
  const pattern = patternSteps[style.pattern].value
  if (pattern === "rings") drawRings(context, colors, style, options)
  if (pattern === "fractal") context.drawImage(renderFractal(colors, style), 0, 0)
}
