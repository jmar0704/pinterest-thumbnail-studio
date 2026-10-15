import { useEffect, useRef } from "react"
import { canvas } from "@/data/templates"
import type { BackgroundStyle } from "@/data/backgroundOptions"
import { drawBackgroundLayer } from "@/lib/drawComposition"
import type { ColorTemplate } from "@/theme/artworkPalette"

/** Drawing size of the preview, in canvas px (16:9, shown at tile width). */
const thumbnail = { width: 320, height: 180 }

/**
 * A background pattern as it will look, in the current colors and with the
 * pattern's current settings, drawn by the same code as the canvas.
 */
export default function PatternThumbnail({
  colors,
  style,
}: {
  colors: ColorTemplate
  style: BackgroundStyle
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = ref.current?.getContext("2d")
    if (!context) return
    const scale = thumbnail.width / canvas.width
    context.setTransform(scale, 0, 0, scale, 0, 0)
    // Thicker ring lines so they survive the 5× reduction (4× stroke).
    drawBackgroundLayer(context, colors, style, { strokeScale: 4 })
  }, [colors, style])
  return (
    <canvas
      aria-hidden
      className="pattern-thumbnail"
      height={thumbnail.height}
      ref={ref}
      width={thumbnail.width}
    />
  )
}
