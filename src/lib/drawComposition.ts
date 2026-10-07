import { canvas, card } from "@/data/templates"
import {
  imageBackingFill,
  placeholderFill,
  strokeColorFor,
  withAlpha,
} from "@/theme/artworkPalette"
import {
  applyCardTransform,
  borderFor,
  shadowFor,
  type Placement,
} from "@/lib/composition"

export type Overlay = {
  selectedSlot: number | null
  /** Slots that cross the margin on a side the template doesn't allow. */
  violatingSlots: Set<number>
  showMarginGuide: boolean
  /** UI token colors, read from CSS variables by the caller. */
  colors: { selection: string; warning: string; guide: string }
}

function cardPath(context: CanvasRenderingContext2D) {
  context.beginPath()
  context.roundRect(
    -card.width / 2,
    -card.height / 2,
    card.width,
    card.height,
    card.cornerRadius,
  )
  context.closePath()
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
    background,
    placements,
    imageForSlot,
    placeholder,
    overlay,
  }: {
    background: string
    placements: Placement[]
    imageForSlot: (slot: number) => HTMLImageElement | undefined
    placeholder: HTMLImageElement
    overlay?: Overlay
  },
) {
  context.save()
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (const placement of placements) {
    const image = imageForSlot(placement.slot)
    const hasImage = isReady(image)
    const shadow = shadowFor(placement.style)
    const border = borderFor(placement.style)

    context.save()
    applyCardTransform(context, placement)

    cardPath(context)
    context.fillStyle = hasImage ? imageBackingFill : placeholderFill
    if (shadow) {
      // Shadow offsets are in canvas space, so they ignore the card transform.
      context.shadowColor = withAlpha(placement.style.shadowColor, shadow.alpha)
      context.shadowBlur = shadow.blur
      context.shadowOffsetY = shadow.offsetY
    }
    context.fill()
    context.shadowBlur = 0
    context.shadowOffsetY = 0

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
      context.strokeStyle = strokeColorFor(background)
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
  const outline = (placement: Placement, color: string, width: number) => {
    context.save()
    applyCardTransform(context, placement)
    cardPath(context)
    context.strokeStyle = color
    context.lineWidth = width / placement.scale
    context.stroke()
    context.restore()
  }

  if (overlay.showMarginGuide || overlay.violatingSlots.size > 0) {
    const margin = canvas.margin
    context.save()
    context.setLineDash([16, 12])
    context.lineWidth = 3
    context.strokeStyle =
      overlay.violatingSlots.size > 0 ? overlay.colors.warning : overlay.colors.guide
    context.strokeRect(
      margin,
      margin,
      canvas.width - margin * 2,
      canvas.height - margin * 2,
    )
    context.restore()
  }

  for (const placement of placements) {
    if (overlay.violatingSlots.has(placement.slot)) {
      outline(placement, overlay.colors.warning, 6)
    }
  }
  const selected = placements.find(
    (placement) => placement.slot === overlay.selectedSlot,
  )
  if (selected && !overlay.violatingSlots.has(selected.slot)) {
    outline(selected, overlay.colors.selection, 6)
  }
}
