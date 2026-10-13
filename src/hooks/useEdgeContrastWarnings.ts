import { useCallback, useEffect, useRef, useState } from "react"
import { card } from "@/data/templates"
import { cardMatrix, type Placement } from "@/lib/composition"
import {
  evaluateEdgeContrast,
  type Crop,
  type EdgeContrastResult,
  type Rect,
  type RGB,
} from "@/lib/edgeContrast"

export type EdgeCheckItem = {
  /** The image's identity (its URL). Dismissals follow the image, not the frame. */
  id: string
  image: HTMLImageElement
  placement: Placement
  /** The crop the renderer actually draws. */
  crop: Crop
  /** Set when a frame border is drawn: its color is the visible edge. */
  edgeColorOverride?: RGB
}

/** Card height, in px, of the downscaled card-space sampling canvas. */
const sampleCardHeight = 96
/** Room around the card for the background bands (band 6 + gap 1 + spare). */
const sampleMargin = 12

/**
 * Re-project the background-only render into one card's own coordinate
 * space, downscaled. The card becomes an axis-aligned rect in the middle, so
 * its rotation, tilt and size are all accounted for, and the bands just
 * outside each edge are exactly what sits behind that edge on the thumbnail.
 * Areas beyond the thumbnail come out transparent, which is how a side that
 * touches the canvas edge gets skipped.
 */
function projectBackground(
  background: HTMLCanvasElement,
  placement: Placement,
): { canvas: HTMLCanvasElement; rect: Rect } {
  const k = sampleCardHeight / card.height
  const w = card.width * k
  const h = card.height * k
  const output = document.createElement("canvas")
  output.width = Math.ceil(w + sampleMargin * 2)
  output.height = Math.ceil(h + sampleMargin * 2)
  const context = output.getContext("2d", { willReadFrequently: true })
  if (!context) return { canvas: output, rect: { x: sampleMargin, y: sampleMargin, w, h } }

  // Card-local units (origin at the card center) -> sampling pixels…
  context.setTransform(k, 0, 0, k, sampleMargin + w / 2, sampleMargin + h / 2)
  // …after undoing the card transform (thumbnail -> card-local).
  const [a, b, c, d, e, f] = cardMatrix(placement)
  const det = a * d - b * c
  context.transform(d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det)
  context.drawImage(background, 0, 0)
  return { canvas: output, rect: { x: sampleMargin, y: sampleMargin, w, h } }
}

const signatureOf = (items: EdgeCheckItem[], backgroundKey: string) =>
  items
    .map((item) => {
      const p = item.placement
      const crop = item.crop
      return [
        item.id,
        Math.round(p.cx),
        Math.round(p.cy),
        p.rotate.toFixed(1),
        p.scale.toFixed(3),
        p.tilt.toFixed(1),
        `${Math.round(crop.sx)},${Math.round(crop.sy)},${Math.round(crop.sw)},${Math.round(crop.sh)}`,
        item.edgeColorOverride ? item.edgeColorOverride.join(",") : "",
      ].join(":")
    })
    .join("|") + `#${backgroundKey}`

/**
 * Low edge contrast warnings for the images on the thumbnail. Re-evaluates
 * (debounced, so dragging stays smooth) whenever an image, its placement,
 * crop or frame border, or the background changes. Never runs in the pointer
 * hot path: pointer moves only change the signature, and the work happens
 * once things settle.
 */
export default function useEdgeContrastWarnings({
  items,
  renderBackground,
  backgroundKey,
  debounceMs = 150,
}: {
  items: EdgeCheckItem[]
  /** Renders ONLY the background (no frames, images, shadows or overlay). */
  renderBackground: () => HTMLCanvasElement | null
  /** Changes whenever the background changes (color template, pattern…). */
  backgroundKey: string
  debounceMs?: number
}) {
  const [results, setResults] = useState<ReadonlyMap<string, EdgeContrastResult>>(new Map())
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  // The debounced job reads the latest inputs without re-subscribing.
  const itemsRef = useRef(items)
  const renderRef = useRef(renderBackground)
  itemsRef.current = items
  renderRef.current = renderBackground

  const signature = signatureOf(items, backgroundKey)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = itemsRef.current
      if (!current.length) {
        setResults(new Map())
        return
      }
      const background = renderRef.current()
      if (!background) return
      const next = new Map<string, EdgeContrastResult>()
      for (const item of current) {
        if (!item.image.complete || !item.image.naturalWidth) continue
        const { canvas, rect } = projectBackground(background, item.placement)
        next.set(
          item.id,
          evaluateEdgeContrast({
            image: item.image,
            backgroundCanvas: canvas,
            rect,
            crop: item.crop,
            cornerRadius: card.cornerRadius / card.width,
            edgeColorOverride: item.edgeColorOverride,
          }),
        )
      }
      setResults(next)
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [signature, debounceMs])

  const keyFor = useCallback((id: string) => `${id}@${backgroundKey}`, [backgroundKey])

  const dismiss = useCallback(
    (id: string) => setDismissed((previous) => new Set(previous).add(keyFor(id))),
    [keyFor],
  )

  const isWarning = useCallback(
    (id: string) => results.get(id)?.level === "warn" && !dismissed.has(keyFor(id)),
    [results, dismissed, keyFor],
  )

  return { results, isWarning, dismiss }
}
