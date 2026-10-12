import { canvas, card } from "@/data/templates"
import {
  glow,
  imageBackingFill,
  placeholderFill,
  strokeColorFor,
  withAlpha,
  type ColorTemplate,
} from "@/theme/artworkPalette"
import {
  applyCardTransform,
  borderFor,
  cardCorners,
  hasDropShadow,
  rotationHandle,
  type Placement,
} from "@/lib/composition"

export type Overlay = {
  selectedSlot: number | null
  /** Slots that cross the margin on a side the template doesn't allow. */
  violatingSlots: Set<number>
  showMarginGuide: boolean
  /** Center lines the dragged card is snapped to. */
  symmetry: { vertical: boolean; horizontal: boolean }
  /** Canvas px per on-screen CSS px, so handles keep a constant screen size. */
  pxPerCss: number
  /** UI token colors, read from CSS variables by the caller. */
  colors: {
    selection: string
    /** Drawn under selection lines so they read on light and deep backgrounds. */
    halo: string
    warning: string
    guide: string
    handleFill: string
  }
}

/** On-screen sizes (CSS px) of the selection chrome. */
export const handleMetrics = { radius: 6, stroke: 2, halo: 2, rotationDistance: 28 }

function cardPath(context: CanvasRenderingContext2D, inflate = 0) {
  context.beginPath()
  context.roundRect(
    -card.width / 2 - inflate,
    -card.height / 2 - inflate,
    card.width + inflate * 2,
    card.height + inflate * 2,
    card.cornerRadius + inflate,
  )
  context.closePath()
}

/**
 * Canvas has no shadow spread, so the CSS box-shadow
 * `0 0 50px <spread> rgba(color, .25)` is drawn as a rounded rect grown by
 * the spread and blurred. A CSS blur radius of 50px is a Gaussian with a
 * standard deviation of 25px, which is what the canvas blur() filter takes.
 */
function drawGlow(
  context: CanvasRenderingContext2D,
  placement: Placement,
  colors: ColorTemplate,
) {
  context.save()
  applyCardTransform(context, placement)
  context.filter = `blur(${(glow.blur / 2) * placement.scale}px)`
  cardPath(context, colors.spread)
  context.fillStyle = withAlpha(colors.shadow, glow.alpha)
  context.fill()
  context.restore()
}

function isReady(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth)
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement) {
  const frameRatio = card.width / card.height
  const imageRatio = image.naturalWidth / image.naturalHeight
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight
  let sourceX = 0
  let sourceY = 0
  if (imageRatio > frameRatio) {
    sourceWidth = image.naturalHeight * frameRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / frameRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -card.width / 2,
    -card.height / 2,
    card.width,
    card.height,
  )
}

/**
 * Paint the thumbnail. Cards are drawn in their own 450×650 space and scaled
 * by the card transform, so border widths and radius scale with the card.
 */
export function drawComposition(
  context: CanvasRenderingContext2D,
  {
    colors,
    placements,
    imageForSlot,
    placeholder,
    overlay,
  }: {
    colors: ColorTemplate
    placements: Placement[]
    imageForSlot: (slot: number) => HTMLImageElement | undefined
    placeholder: HTMLImageElement
    overlay?: Overlay
  },
) {
  context.save()
  context.fillStyle = colors.background
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (const placement of placements) {
    const image = imageForSlot(placement.slot)
    const hasImage = isReady(image)
    const border = borderFor(placement.style)

    if (hasDropShadow(placement.style)) drawGlow(context, placement, colors)

    context.save()
    applyCardTransform(context, placement)

    cardPath(context)
    context.fillStyle = hasImage ? imageBackingFill : placeholderFill
    context.fill()

    context.save()
    cardPath(context)
    context.clip()
    if (hasImage) drawCover(context, image)
    else if (isReady(placeholder)) {
      context.drawImage(
        placeholder,
        -card.width / 2,
        -card.height / 2,
        card.width,
        card.height,
      )
    }
    context.restore()

    if (border > 0) {
      cardPath(context)
      context.strokeStyle = strokeColorFor(colors.background)
      // Border sits inside the card edge so it never changes the card's footprint.
      context.save()
      context.clip()
      context.lineWidth = border * 2
      context.stroke()
      context.restore()
    }
    context.restore()
  }

  if (overlay) drawOverlay(context, placements, overlay)
  context.restore()
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  placements: Placement[],
  overlay: Overlay,
) {
  const px = overlay.pxPerCss

  const outline = (placement: Placement, color: string, width: number) => {
    context.save()
    applyCardTransform(context, placement)
    cardPath(context)
    context.strokeStyle = color
    context.lineWidth = width / placement.scale
    context.stroke()
    context.restore()
  }

  const handle = (point: { x: number; y: number }) => {
    context.beginPath()
    context.arc(
      point.x,
      point.y,
      (handleMetrics.radius + handleMetrics.stroke / 2 + handleMetrics.halo) * px,
      0,
      Math.PI * 2,
    )
    context.fillStyle = overlay.colors.halo
    context.fill()
    context.beginPath()
    context.arc(point.x, point.y, handleMetrics.radius * px, 0, Math.PI * 2)
    context.fillStyle = overlay.colors.handleFill
    context.fill()
    context.lineWidth = handleMetrics.stroke * px
    context.strokeStyle = overlay.colors.selection
    context.stroke()
  }

  if (overlay.showMarginGuide || overlay.violatingSlots.size > 0) {
    const margin = canvas.margin
    context.save()
    context.setLineDash([16, 12])
    context.lineWidth = 3
    context.strokeStyle =
      overlay.violatingSlots.size > 0 ? overlay.colors.warning : overlay.colors.guide
    context.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2)
    context.restore()
  }

  /** A selection-colored line with a halo underneath. */
  const line = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    for (const [color, width] of [
      [overlay.colors.halo, handleMetrics.stroke + handleMetrics.halo * 2],
      [overlay.colors.selection, handleMetrics.stroke],
    ] as const) {
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
      context.strokeStyle = color
      context.lineWidth = width * px
      context.stroke()
    }
  }

  // Symmetry lines: the canvas's center lines while a card is snapped to them.
  if (overlay.symmetry.vertical) {
    line({ x: canvas.width / 2, y: 0 }, { x: canvas.width / 2, y: canvas.height })
  }
  if (overlay.symmetry.horizontal) {
    line({ x: 0, y: canvas.height / 2 }, { x: canvas.width, y: canvas.height / 2 })
  }

  for (const placement of placements) {
    if (overlay.violatingSlots.has(placement.slot)) {
      outline(placement, overlay.colors.warning, 6)
    }
  }

  const selected = placements.find((placement) => placement.slot === overlay.selectedSlot)
  if (!selected) return
  if (!overlay.violatingSlots.has(selected.slot)) {
    outline(selected, overlay.colors.halo, (handleMetrics.stroke + handleMetrics.halo * 2) * px)
    outline(selected, overlay.colors.selection, handleMetrics.stroke * px)
  }
  // Rotation handle on a stem above the top edge, then the four corner handles.
  const { anchor, handle: top } = rotationHandle(selected, handleMetrics.rotationDistance * px)
  context.save()
  line(anchor, top)
  handle(top)
  cardCorners(selected).forEach(handle)
  context.restore()
}
