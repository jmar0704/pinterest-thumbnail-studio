import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  BannerSlim,
  Box,
  Button,
  DesignTokensProvider,
  Divider,
  Flex,
  Heading,
  Icon,
  IconButton,
  Layer,
  TapArea,
  Text,
  Toast,
} from "gestalt"
import "gestalt/dist/gestalt.css"
import BackgroundStylePanel from "@/components/BackgroundStylePanel"
import BlogPreview from "@/components/BlogPreview"
import ColorTemplatePicker from "@/components/ColorTemplatePicker"
import DropShadowSwitch from "@/components/DropShadowSwitch"
import EdgeContrastNotice from "@/components/EdgeContrastNotice"
import FrameChips from "@/components/FrameChips"
import FrameToolbar from "@/components/FrameToolbar"
import StylePanel from "@/components/StylePanel"
import TemplatePicker from "@/components/TemplatePicker"
import useEdgeContrastWarnings, { type EdgeCheckItem } from "@/hooks/useEdgeContrastWarnings"
import useHistory from "@/hooks/useHistory"
import { canvas, findTemplate, maxCards, templates } from "@/data/templates"
import { defaultCardStyle, isDefaultStyle, type CardStyle } from "@/data/styleOptions"
import {
  defaultBackgroundStyle,
  isDefaultBackgroundStyle,
  type BackgroundStyle,
} from "@/data/backgroundOptions"
import {
  borderFor,
  cardCorners,
  clampOffset,
  computePlacements,
  extentOf,
  hitTest,
  marginViolations,
  rotateStepFor,
  rotationHandle,
  sizeStepFor,
  snapToSymmetry,
  type Offset,
  type Placement,
} from "@/lib/composition"
import {
  coverCrop,
  drawBackgroundLayer,
  drawComposition,
  handleMetrics,
} from "@/lib/drawComposition"
import type { EdgeContrastResult } from "@/lib/edgeContrast"
import {
  colorTemplates,
  findColorTemplate,
  rgbOf,
  strokeColorFor,
  whiteColorTemplate,
  type ColorTemplate,
} from "@/theme/artworkPalette"
import { iconSizes, sizes } from "@/theme/sizes"

type Doc = {
  templateId: string | null
  styles: CardStyle[]
  offsets: Offset[]
  /** Color template id: background + paired drop-shadow glow. */
  colors: string
  /** Pattern drawn over the background color, behind the frames. */
  backgroundStyle: BackgroundStyle
  /** One image per card slot; null shows the placeholder. Images never repeat. */
  slotImages: (string | null)[]
}

/** What a pointer press on the canvas is doing. */
type Gesture = {
  kind: "move" | "resize" | "rotate"
  slot: number
  pointerX: number
  pointerY: number
  origin: Offset
  start: Doc
  moved: boolean
}

type Point = { x: number; y: number }

const zeroOffsets = (): Offset[] => Array.from({ length: maxCards }, () => ({ x: 0, y: 0 }))
const defaultStyles = (): CardStyle[] =>
  Array.from({ length: maxCards }, () => ({ ...defaultCardStyle }))

const initialDoc: Doc = {
  templateId: null,
  styles: defaultStyles(),
  offsets: zeroOffsets(),
  colors: whiteColorTemplate.id,
  backgroundStyle: { ...defaultBackgroundStyle },
  slotImages: Array.from({ length: maxCards }, () => null),
}

const maxFileBytes = 10 * 1024 * 1024
const placeholderImageSrc = "/assets/580dc.svg"
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const noSymmetry = { vertical: false, horizontal: false }
/** Keyboard and toolbar nudge distances, in canvas px (Shift = large). */
const nudgeSteps = { small: 8, large: 48 }

function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** The smallest template with room for `count` images (the largest if none). */
function templateFor(count: number) {
  const bySize = [...templates].sort((a, b) => a.cards.length - b.cards.length)
  return bySize.find((item) => item.cards.length >= count) ?? bySize[bySize.length - 1]
}

const imagesOf = (doc: Doc) => doc.slotImages.filter((src): src is string => src !== null)

function listFrames(slots: number[]) {
  const names = slots.map((slot) => slot + 1)
  if (names.length === 1) return `Frame ${names[0]} crosses`
  return `Frames ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} cross`
}

// Object URLs stay alive while any undo step can still show them.
function revokeUnused(dropped: Doc[], retained: Doc[]) {
  const live = new Set(retained.flatMap(imagesOf))
  for (const url of new Set(dropped.flatMap(imagesOf))) {
    if (!live.has(url)) URL.revokeObjectURL(url)
  }
}

/**
 * The background fix for an image whose edges blend in: lighten the
 * background when the image's edges are darker than it, darken it when
 * they're lighter. Uses an existing color: the same hue's other tone, or
 * White / Gray deep. `id` is null when there's no such color to switch to.
 */
function backgroundFixFor(result: EdgeContrastResult, current: ColorTemplate) {
  const weak = result.weakSides.flatMap((side) => result.sides[side] ?? [])
  const edge = weak.reduce((total, item) => total + item.edgeLuminance, 0) / Math.max(1, weak.length)
  const background =
    weak.reduce((total, item) => total + item.backgroundLuminance, 0) / Math.max(1, weak.length)
  const lighten = edge <= background
  const hue = current.id.replace(/-(light|deep)$/, "")
  const targetId = lighten
    ? current.tone === "deep"
      ? `${hue}-light`
      : current.id === whiteColorTemplate.id
        ? null
        : whiteColorTemplate.id
    : current.tone === "light"
      ? current.id === whiteColorTemplate.id
        ? "gray-deep"
        : `${hue}-deep`
      : null
  const target = colorTemplates.find((item) => item.id === targetId) ?? null
  return {
    id: target?.id ?? null,
    label: lighten ? "Lighten background" : "Darken background",
    description: target
      ? `Switch the background to ${target.name}`
      : `There's no ${lighten ? "lighter" : "darker"} background color to switch to`,
  }
}

const near = (a: Point, b: Point, radius: number) => Math.hypot(a.x - b.x, a.y - b.y) <= radius

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { state: doc, commit, preview, settle, undo, redo, canUndo, canRedo } =
    useHistory<Doc>(initialDoc, revokeUnused)
  /** The frame being edited, or null when none is selected. */
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [gestureKind, setGestureKind] = useState<Gesture["kind"] | null>(null)
  const [symmetry, setSymmetry] = useState(noSymmetry)
  const [hoverCursor, setHoverCursor] = useState("default")
  const [status, setStatus] = useState("")
  const [imagesLoaded, setImagesLoaded] = useState(0)
  const [styleExpanded, setStyleExpanded] = useState(false)
  const [backgroundStyleExpanded, setBackgroundStyleExpanded] = useState(false)
  /** Snapshot of the design shown in the blog preview, or null when closed. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])
  /** The canvas's on-screen box inside the artboard frame, in CSS px. */
  const [canvasBox, setCanvasBox] = useState({ left: 0, top: 0, width: 1, height: 1 })

  const template = findTemplate(doc.templateId)
  const isEmptyState = doc.templateId === null
  const cardCount = template.cards.length
  const slot = selectedSlot === null ? null : Math.min(selectedSlot, cardCount - 1)
  /** Slot to read values from while nothing is selected (controls are disabled then). */
  const activeSlot = slot ?? 0
  /** Canvas px per on-screen CSS px. */
  const pxPerCss = canvas.width / canvasBox.width

  const announce = useCallback((message: string) => setStatus(message), [])
  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(""), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  // Track where the canvas sits on screen, for handles and the frame toolbar.
  useLayoutEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const measure = () =>
      setCanvasBox({
        left: element.offsetLeft,
        top: element.offsetTop,
        width: element.offsetWidth || 1,
        height: element.offsetHeight || 1,
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.parentElement) observer.observe(element.parentElement)
    return () => observer.disconnect()
  }, [])

  const placements = useMemo(
    () => computePlacements({ template, styles: doc.styles, offsets: doc.offsets }),
    [template, doc.styles, doc.offsets],
  )
  const selectedPlacement = placements.find((placement) => placement.slot === slot) ?? null

  const violatingSlots = useMemo(
    () =>
      new Set(
        placements
          .filter((placement) => marginViolations(placement, template.allowBleed).length)
          .map((placement) => placement.slot),
      ),
    [placements, template],
  )

  const imageSrcForSlot = useCallback(
    (cardSlot: number) => doc.slotImages[cardSlot] ?? undefined,
    [doc.slotImages],
  )
  const layoutImages = doc.slotImages.slice(0, cardCount)
  const filledCount = layoutImages.filter(Boolean).length
  const emptySlots = layoutImages.flatMap((src, index) => (src ? [] : [index]))
  /** Slots past this layout's frames that still hold an image. */
  const spareSlots = doc.slotImages.flatMap((src, index) =>
    src && index >= cardCount ? [index] : [],
  )
  const totalImages = filledCount + spareSlots.length

  const imageElements = useMemo(() => {
    const map = new Map<string, HTMLImageElement>()
    for (const src of imagesOf(doc)) {
      const image = new Image()
      image.src = src
      map.set(src, image)
    }
    return map
  }, [doc.slotImages])

  const placeholderImage = useMemo(() => {
    const image = new Image()
    image.src = placeholderImageSrc
    return image
  }, [])

  // Redraw once each image finishes decoding.
  useEffect(() => {
    const elements = [placeholderImage, ...imageElements.values()]
    const onLoad = () => setImagesLoaded((count) => count + 1)
    elements.forEach((image) => image.addEventListener("load", onLoad))
    return () => elements.forEach((image) => image.removeEventListener("load", onLoad))
  }, [imageElements, placeholderImage])

  // ---- Low edge contrast check ---------------------------------------------

  const colorTemplate = findColorTemplate(doc.colors)

  /** Background only (color + pattern), for sampling what sits behind each edge. */
  const renderBackgroundOnly = () => {
    const output = document.createElement("canvas")
    output.width = canvas.width
    output.height = canvas.height
    const context = output.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    drawBackgroundLayer(context, colorTemplate, doc.backgroundStyle)
    return output
  }

  const edgeItems = useMemo<EdgeCheckItem[]>(
    () =>
      placements.flatMap((placement) => {
        const src = doc.slotImages[placement.slot]
        const image = src ? imageElements.get(src) : undefined
        if (!src || !image?.complete || !image.naturalWidth) return []
        // A drawn border is the visible edge, so judge its color instead.
        const border = borderFor(placement.style) > 0
        return [
          {
            id: src,
            image,
            placement,
            crop: coverCrop(image),
            edgeColorOverride: border ? rgbOf(strokeColorFor(colorTemplate.background)) : undefined,
          },
        ]
      }),
    // imagesLoaded: re-check once each image finishes decoding.
    [placements, doc.slotImages, imageElements, imagesLoaded, colorTemplate],
  )

  const edgeContrast = useEdgeContrastWarnings({
    items: edgeItems,
    renderBackground: renderBackgroundOnly,
    backgroundKey: `${doc.colors}|${JSON.stringify(doc.backgroundStyle)}`,
  })

  const edgeWarningSlots = useMemo(
    () =>
      new Set(
        placements
          .filter((placement) => {
            const src = doc.slotImages[placement.slot]
            return Boolean(src && edgeContrast.isWarning(src))
          })
          .map((placement) => placement.slot),
      ),
    [placements, doc.slotImages, edgeContrast],
  )
  const selectedImage = slot !== null ? doc.slotImages[slot] : null
  const selectedEdgeResult =
    selectedImage && edgeContrast.isWarning(selectedImage)
      ? (edgeContrast.results.get(selectedImage) ?? null)
      : null
  const selectedBackgroundFix = selectedEdgeResult
    ? backgroundFixFor(selectedEdgeResult, colorTemplate)
    : null

  useEffect(() => {
    const element = canvasRef.current
    const context = element?.getContext("2d")
    if (!element || !context) return
    element.width = canvas.width
    element.height = canvas.height
    drawComposition(context, {
      colors: findColorTemplate(doc.colors),
      backgroundStyle: doc.backgroundStyle,
      placements,
      imageForSlot: (cardSlot) => {
        const src = imageSrcForSlot(cardSlot)
        return src ? imageElements.get(src) : undefined
      },
      placeholder: placeholderImage,
      overlay: {
        selectedSlot: slot,
        violatingSlots,
        tintSlots: edgeWarningSlots,
        showMarginGuide: gestureKind === "move",
        symmetry,
        pxPerCss,
        colors: {
          // Solid info blue (4.8:1 on white) plus a white halo: WCAG 1.4.11
          // on light and deep backgrounds alike.
          selection: readToken("--color-icon-info"),
          halo: readToken("--color-background-default"),
          warning: readToken("--color-icon-warning"),
          guide: readToken("--color-border-default"),
          handleFill: readToken("--color-background-default"),
          tint: readToken("--color-background-warning-base"),
        },
      },
    })
  }, [
    doc.colors,
    doc.backgroundStyle,
    placements,
    imageSrcForSlot,
    imageElements,
    placeholderImage,
    slot,
    violatingSlots,
    edgeWarningSlots,
    gestureKind,
    symmetry,
    pxPerCss,
    imagesLoaded,
  ])

  // Undo / redo shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey
      if (!modifier || event.key.toLowerCase() !== "z") return
      // Leave text fields (e.g. the preview title) their own undo.
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, [contenteditable='true']")) return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undo, redo])

  // ---- Canvas gestures: move, resize (corners), rotate (top handle) -------------

  const gestureRef = useRef<Gesture | null>(null)

  const toCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    }
  }

  /** Which selection handle (if any) is under a canvas point, and which corner. */
  const handleAt = (point: Point) => {
    if (!selectedPlacement) return null
    const radius = (handleMetrics.radius + 6) * pxPerCss
    const { handle } = rotationHandle(selectedPlacement, handleMetrics.rotationDistance * pxPerCss)
    if (near(point, handle, radius)) return { kind: "rotate" as const, corner: -1 }
    const corner = cardCorners(selectedPlacement).findIndex((item) => near(point, item, radius))
    return corner === -1 ? null : { kind: "resize" as const, corner }
  }

  const cursorFor = (point: Point) => {
    const onHandle = handleAt(point)
    if (onHandle?.kind === "rotate") return "crosshair"
    if (onHandle) return onHandle.corner % 2 === 0 ? "nwse-resize" : "nesw-resize"
    return hitTest(placements, point.x, point.y) ? "grab" : "default"
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event)
    const onHandle = handleAt(point)
    const hit = onHandle ? selectedPlacement : hitTest(placements, point.x, point.y)
    if (!hit) {
      setSelectedSlot(null)
      return
    }
    setSelectedSlot(hit.slot)
    gestureRef.current = {
      kind: onHandle?.kind ?? "move",
      slot: hit.slot,
      pointerX: event.clientX,
      pointerY: event.clientY,
      origin: doc.offsets[hit.slot],
      start: doc,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    const point = toCanvasPoint(event)
    if (!gesture) {
      setHoverCursor(cursorFor(point))
      return
    }
    const dx = (event.clientX - gesture.pointerX) * pxPerCss
    const dy = (event.clientY - gesture.pointerY) * pxPerCss
    if (!gesture.moved && Math.hypot(dx, dy) < 3) return
    if (!gesture.moved) {
      gesture.moved = true
      setGestureKind(gesture.kind)
    }
    const placement = placements.find((item) => item.slot === gesture.slot)
    if (!placement) return

    if (gesture.kind === "move") {
      const clamped = clampOffset(
        placement,
        { x: gesture.origin.x + dx, y: gesture.origin.y + dy },
        template.allowBleed,
      )
      // Snap to the canvas's center lines, then keep the margin rule.
      const snapped = snapToSymmetry(placement.baseX + clamped.x, placement.baseY + clamped.y)
      const next = clampOffset(
        placement,
        { x: snapped.cx - placement.baseX, y: snapped.cy - placement.baseY },
        template.allowBleed,
      )
      setSymmetry({
        vertical: snapped.guides.vertical && placement.baseX + next.x === canvas.width / 2,
        horizontal: snapped.guides.horizontal && placement.baseY + next.y === canvas.height / 2,
      })
      preview((current) => ({
        ...current,
        offsets: current.offsets.map((offset, index) => (index === gesture.slot ? next : offset)),
      }))
      return
    }

    // Resize and rotate snap to the same preset steps as the Style controls.
    const update: Partial<CardStyle> =
      gesture.kind === "resize"
        ? { size: sizeStepFor(placement, point) }
        : { rotate: rotateStepFor(placement, template.cards[gesture.slot].rotate, point) }
    const style = doc.styles[gesture.slot]
    if (Object.entries(update).every(([key, value]) => style[key as keyof CardStyle] === value)) {
      return
    }
    preview((current) => ({
      ...current,
      styles: current.styles.map((item, index) =>
        index === gesture.slot ? { ...item, ...update } : item,
      ),
    }))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    if (gesture?.moved) settle(gesture.start)
    gestureRef.current = null
    setGestureKind(null)
    setSymmetry(noSymmetry)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  // ---- Actions ---------------------------------------------------------------

  const selectTemplate = (id: string) => {
    if (id === doc.templateId) return
    // Card slots don't correspond between templates, so start each one clean.
    commit((current) => ({
      ...current,
      templateId: id,
      offsets: zeroOffsets(),
      styles: defaultStyles(),
    }))
    setSelectedSlot(0)
  }

  const clearTemplate = () => {
    commit((current) => ({
      ...current,
      templateId: null,
      offsets: zeroOffsets(),
      styles: defaultStyles(),
    }))
    setSelectedSlot(null)
    announce("Back to the empty layout. Your images are kept.")
  }

  const updateStyle = (update: Partial<CardStyle>) =>
    slot !== null &&
    commit((current) => ({
      ...current,
      styles: current.styles.map((style, index) =>
        index === slot ? { ...style, ...update } : style,
      ),
    }))

  /** The selected frame back to its template spot and default style. */
  const resetFrame = () =>
    slot !== null &&
    commit((current) => ({
      ...current,
      offsets: current.offsets.map((offset, index) => (index === slot ? { x: 0, y: 0 } : offset)),
      styles: current.styles.map((style, index) =>
        index === slot ? { ...defaultCardStyle } : style,
      ),
    }))

  /** Every frame, style, the background color and pattern back to the template as designed. */
  const resetAll = () => {
    commit((current) => ({
      ...current,
      offsets: zeroOffsets(),
      styles: defaultStyles(),
      colors: whiteColorTemplate.id,
      backgroundStyle: { ...defaultBackgroundStyle },
    }))
    announce(`${template.name} is back to its original design`)
  }

  const isMoved = (offset: Offset) => offset.x !== 0 || offset.y !== 0
  const isFrameChanged =
    slot !== null && (isMoved(doc.offsets[slot]) || !isDefaultStyle(doc.styles[slot]))
  const canResetAll =
    doc.offsets.slice(0, cardCount).some(isMoved) ||
    doc.styles.slice(0, cardCount).some((style) => !isDefaultStyle(style)) ||
    doc.colors !== whiteColorTemplate.id ||
    !isDefaultBackgroundStyle(doc.backgroundStyle)

  const pickImages = (multiple: boolean, onPick: (files: File[]) => void) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/png,image/jpeg,image/webp"
    input.multiple = multiple
    input.onchange = () => {
      const files = Array.from(input.files ?? [])
      const valid = files.filter((file) => file.size <= maxFileBytes)
      if (!valid.length) {
        announce("Choose images under 10 MB")
        return
      }
      if (valid.length < files.length) announce("Some files were over 10 MB and were skipped")
      onPick(valid)
    }
    input.click()
  }

  /**
   * Fill empty frames in order, one image per frame. If the images don't fit
   * the current layout, switch to the smallest template that holds them all.
   */
  const addImages = () =>
    pickImages(true, (files) => {
      const room = maxCards - totalImages
      const accepted = files.slice(0, room)
      if (!accepted.length) {
        announce(`You can use up to ${maxCards} images`)
        return
      }
      const urls = accepted.map((file) => URL.createObjectURL(file))
      const total = totalImages + urls.length
      const target = total > cardCount ? templateFor(total) : null

      commit((current) => {
        const count = target ? target.cards.length : cardCount
        const slotImages = [...current.slotImages]
        // When switching to fit, pull spare images into view too.
        const incoming = target
          ? [...slotImages.slice(count).filter((src): src is string => src !== null), ...urls]
          : urls
        if (target) for (let index = count; index < maxCards; index += 1) slotImages[index] = null
        let next = 0
        for (let index = 0; index < count && next < incoming.length; index += 1) {
          if (!slotImages[index]) slotImages[index] = incoming[next++]
        }
        return target
          ? {
              ...current,
              templateId: target.id,
              offsets: zeroOffsets(),
              styles: defaultStyles(),
              slotImages,
            }
          : { ...current, slotImages }
      })
      setSelectedSlot(target ? 0 : (emptySlots[0] ?? 0))

      const skipped = files.length - accepted.length
      announce(
        [
          `${urls.length} ${urls.length === 1 ? "image" : "images"} added`,
          target && target.id !== doc.templateId ? `switched to ${target.name} to fit ${total}` : "",
          skipped > 0 ? `${skipped} skipped (${maxCards} max)` : "",
        ]
          .filter(Boolean)
          .join(", "),
      )
    })

  const replaceImage = () =>
    slot !== null &&
    pickImages(false, ([file]) => {
      const url = URL.createObjectURL(file)
      commit((current) => ({
        ...current,
        slotImages: current.slotImages.map((src, index) => (index === slot ? url : src)),
      }))
      announce(`Frame ${slot + 1} image ${doc.slotImages[slot] ? "replaced" : "added"}`)
    })

  const swapImages = (from: number, to: number) => {
    commit((current) => {
      const slotImages = [...current.slotImages]
      ;[slotImages[from], slotImages[to]] = [slotImages[to], slotImages[from]]
      return { ...current, slotImages }
    })
    const visible = to < cardCount ? to : from
    setSelectedSlot(visible)
    const spare = from >= cardCount || to >= cardCount
    announce(
      spare
        ? `Moved a spare image into frame ${visible + 1}`
        : `Swapped frames ${from + 1} and ${to + 1}`,
    )
  }

  /** A short-lived confirmation shown as a Gestalt Toast. */
  const showToast = (message: string) => {
    setToast(message)
    announce(message)
  }

  /**
   * "Add outline" from the edge contrast notice: a Thin border on every frame
   * that has none (thicker borders stay), so the frames stay consistent.
   */
  const addOutlineToAllFrames = () => {
    commit((current) => ({
      ...current,
      styles: current.styles.map((style, index) =>
        index < cardCount && style.border === 0 ? { ...style, border: 1 } : style,
      ),
    }))
    showToast("Outline added to all frames to maintain consistency")
  }

  /** Border control's "Apply to all": the selected frame's border on every frame. */
  const applyBorderToAllFrames = () => {
    if (slot === null) return
    const border = doc.styles[slot].border
    commit((current) => ({
      ...current,
      styles: current.styles.map((style, index) =>
        index < cardCount ? { ...style, border } : style,
      ),
    }))
    showToast("Border applied to all frames")
  }
  const borderMatchesAllFrames =
    slot !== null &&
    doc.styles.slice(0, cardCount).every((style) => style.border === doc.styles[slot].border)

  /** Removes the selected frame's image only; the frame itself stays. */
  const deleteImage = () => {
    if (slot === null) return
    commit((current) => ({
      ...current,
      slotImages: current.slotImages.map((src, index) => (index === slot ? null : src)),
    }))
    announce(`Frame ${slot + 1} image deleted`)
  }

  /**
   * Move the selected frame by keyboard or the toolbar's nudge buttons, with
   * the same margin limits as dragging. Snaps to a center line only while
   * moving toward it, so a centered frame can still be nudged off center.
   */
  const nudge = (dx: number, dy: number) => {
    if (slot === null || !selectedPlacement) return
    const placement = selectedPlacement
    const current = doc.offsets[slot]
    const moved = clampOffset(
      placement,
      { x: current.x + dx, y: current.y + dy },
      template.allowBleed,
    )
    const cx = placement.baseX + moved.x
    const cy = placement.baseY + moved.y
    const snapped = snapToSymmetry(cx, cy)
    const midX = canvas.width / 2
    const midY = canvas.height / 2
    const towardX = Math.abs(cx - midX) < Math.abs(placement.cx - midX)
    const towardY = Math.abs(cy - midY) < Math.abs(placement.cy - midY)
    const next = clampOffset(
      placement,
      {
        x: (snapped.guides.vertical && towardX ? midX : cx) - placement.baseX,
        y: (snapped.guides.horizontal && towardY ? midY : cy) - placement.baseY,
      },
      template.allowBleed,
    )
    if (next.x === current.x && next.y === current.y) return
    commit((state) => ({
      ...state,
      offsets: state.offsets.map((offset, index) => (index === slot ? next : offset)),
    }))
    const centeredX = placement.baseX + next.x === midX && placement.cx !== midX
    const centeredY = placement.baseY + next.y === midY && placement.cy !== midY
    if (centeredX || centeredY) {
      announce(
        `Frame ${slot + 1} centered ${centeredX && centeredY ? "on the canvas" : centeredX ? "horizontally" : "vertically"}`,
      )
    }
  }

  // Arrow keys nudge the selected frame (Shift for bigger steps) when focus is
  // on the canvas, the frame tiles, the frame toolbar or nothing in particular.
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge
  useEffect(() => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const step = steps[event.key]
      if (!step || event.altKey || event.metaKey || event.ctrlKey) return
      const target = event.target as HTMLElement | null
      const onEditorSurface =
        !target ||
        target === document.body ||
        target.closest("canvas.artboard, [data-frame-slot], [role='toolbar']") !== null
      if (!onEditorSurface) return
      event.preventDefault()
      const distance = event.shiftKey ? nudgeSteps.large : nudgeSteps.small
      nudgeRef.current(step[0] * distance, step[1] * distance)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Keyboard bridge between the frame tiles (right sidebar) and the frame
  // toolbar (on the canvas), which sit far apart in tab order.
  const focusFrameToolbar = () =>
    document.querySelector<HTMLElement>("[role='toolbar'] [role='button']")?.focus()
  const focusFrameTile = (frame: number) =>
    document
      .querySelector<HTMLElement>(`[data-frame-slot="${frame}"] [role='button']`)
      ?.focus()

  /** The thumbnail as exported: no guides, no selection outline. */
  const renderThumbnail = () => {
    const output = document.createElement("canvas")
    output.width = canvas.width
    output.height = canvas.height
    const context = output.getContext("2d")
    if (!context) return null
    drawComposition(context, {
      colors: findColorTemplate(doc.colors),
      backgroundStyle: doc.backgroundStyle,
      placements,
      imageForSlot: (cardSlot) => {
        const src = imageSrcForSlot(cardSlot)
        return src ? imageElements.get(src) : undefined
      },
      placeholder: placeholderImage,
    })
    return output
  }

  const openPreview = () => {
    const output = renderThumbnail()
    if (output) setPreviewUrl(output.toDataURL("image/png"))
  }

  const exportImage = () => {
    const output = renderThumbnail()
    if (!output) return
    output.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `thumbnail-${template.id}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      announce("PNG exported")
    }, "image/png")
  }

  /**
   * Where the selected frame's toolbar sits (CSS px within the artboard frame):
   * centered under the frame, kept inside the canvas when the frame runs off it.
   */
  const toolbarPosition = (placement: Placement) => {
    const extent = extentOf(placement)
    const toolbarHeight = sizes.toolbarButton + 16
    const centerX = Math.min(Math.max(placement.cx, 0), canvas.width) / pxPerCss
    const below = Math.min(extent.bottom, canvas.height) / pxPerCss + sizes.toolbarOffset
    const top = Math.min(below, canvasBox.height - toolbarHeight - sizes.toolbarOffset)
    return { left: canvasBox.left + centerX, top: canvasBox.top + top }
  }

  const undoShortcut = isMac ? "⌘Z" : "Ctrl+Z"
  const redoShortcut = isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"

  return (
    <DesignTokensProvider>
      <Box color="default" display="flex" direction="column" height="100vh">
        <Box as="header" borderStyle="sm" paddingX={5} paddingY={3}>
          {/* Wraps on narrow screens so the header never scrolls sideways. */}
          <Flex alignItems="center" gap={{ column: 2, row: 0 }} justifyContent="between" wrap>
            <Heading accessibilityLevel={1} size="400">
              Thumbnail Studio
            </Heading>
            <Flex alignItems="center" gap={2} wrap>
              <Box aria-live="polite" marginEnd={2}>
                <Text color="subtle" size="200">
                  {status}
                </Text>
              </Box>
              <IconButton
                accessibilityLabel="Undo"
                bgColor="lightGray"
                disabled={!canUndo}
                icon="undo"
                iconColor="darkGray"
                onClick={undo}
                size="md"
                tooltip={{ text: `Undo (${undoShortcut})` }}
              />
              <IconButton
                accessibilityLabel="Redo"
                bgColor="lightGray"
                disabled={!canRedo}
                icon="redo"
                iconColor="darkGray"
                onClick={redo}
                size="md"
                tooltip={{ text: `Redo (${redoShortcut})` }}
              />
              <Box marginStart={2}>
                <Button
                  color="red"
                  onClick={exportImage}
                  size="md"
                  text="Export"
                />
              </Box>
            </Flex>
          </Flex>
        </Box>

        <div
          className="workspace"
          style={
            {
              "--left-panel-width": `${sizes.leftPanelWidth}px`,
              "--right-panel-width": `${sizes.rightPanelWidth}px`,
            } as React.CSSProperties
          }
        >
          {/* Left: format, images, background, templates */}
          <div className="workspace-left">
            <Box
              aria-label="Images, colors and templates"
              as="aside"
              borderStyle="sm" height="100%" overflow="scrollY" padding={4}>
              <Flex direction="column" gap={5}>
                <div aria-level={2} role="heading">
                  <Text size="200" weight="bold">
                    Blog header format: {canvas.width} × {canvas.height} pixels
                  </Text>
                </div>

                <TapArea
                  accessibilityLabel="Add images to empty frames"
                  disabled={totalImages >= maxCards}
                  onTap={addImages}
                  rounding={4}
                  tapStyle="compress"
                >
                  <Box borderStyle="sm" padding={4} rounding={4}>
                    <Flex alignItems="center" direction="column" gap={2}>
                      <Icon
                        accessibilityLabel=""
                        color={totalImages < maxCards ? "subtle" : "disabled"}
                        icon="upload-feed"
                        size={iconSizes.lg}
                      />
                      <Text
                        align="center"
                        color={totalImages < maxCards ? "default" : "disabled"}
                        size="200"
                        weight="bold"
                      >
                        {totalImages < maxCards ? "Add images" : `All ${maxCards} images added`}
                      </Text>
                      <Text align="center" color="subtle" size="200">
                        JPG or PNG or WebP • Max {maxCards} Images • 10MB Max Per Image
                      </Text>
                    </Flex>
                  </Box>
                </TapArea>

                <Divider />

                <Flex direction="column" gap={4}>
                  <ColorTemplatePicker
                    onChange={(colors) => {
                      if (colors !== doc.colors) commit((current) => ({ ...current, colors }))
                    }}
                    templates={colorTemplates}
                    value={doc.colors}
                  />
                  <DropShadowSwitch
                    onChange={(on) => updateStyle({ dropShadow: on ? 1 : 0 })}
                    onAnnounce={announce}
                    slot={slot}
                    switched={doc.styles[activeSlot].dropShadow === 1}
                  />
                </Flex>

                <Divider />

                <Flex direction="column" gap={3}>
                  <Flex alignItems="center" justifyContent="between">
                    <div aria-level={2} role="heading">
                      <Text size="200" weight="bold">
                        Templates
                      </Text>
                    </div>
                    {!isEmptyState ? (
                      <Button
                        color="transparent"
                        iconStart="arrow-back"
                        onClick={clearTemplate}
                        size="sm"
                        text="Empty layout"
                      />
                    ) : null}
                  </Flex>
                  <Text color="subtle" size="200">
                    Pick a template to arrange your frames.
                  </Text>
                  <TemplatePicker
                    onSelect={selectTemplate}
                    selectedId={doc.templateId}
                    templates={templates}
                  />
                </Flex>
              </Flex>
            </Box>
          </div>

          {/* Center: artboard, frame toolbar and preview */}
          <main
            className="workspace-stage"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement
              if (
                target.closest(
                  "canvas, button, a, input, [role='button'], [role='toolbar'], [role='tab'], .frame-toolbar-anchor",
                )
              ) {
                return
              }
              setSelectedSlot(null)
            }}
          >
            <Box color="secondary" display="flex" height="100%" padding={6}>
              <Flex direction="column" flex="grow" gap={4} minWidth={0}>
                {violatingSlots.size > 0 ? (
                  <BannerSlim
                    iconAccessibilityLabel="Warning"
                    message={`${listFrames([...violatingSlots].sort((a, b) => a - b))} the ${canvas.margin}px margin. Drag back inside, or lower Size, Rotate or 3D tilt.`}
                    type="warning"
                  />
                ) : null}

                <Flex.Item flex="grow" minWidth={0}>
                  <div className="artboard-frame">
                    <canvas
                      aria-label={`Preview of the ${template.name} thumbnail. Select a frame, then drag it or use the arrow keys to move it (Shift for bigger steps). Drag its corners to resize or its top handle to rotate.`}
                      className="artboard"
                      onPointerCancel={handlePointerUp}
                      onPointerDown={handlePointerDown}
                      onPointerLeave={() => {
                        if (!gestureRef.current) setHoverCursor("default")
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      ref={canvasRef}
                      role="img"
                      tabIndex={0}
                      style={{ cursor: gestureKind === "move" ? "grabbing" : hoverCursor }}
                    />
                    <Button color="white" iconStart="eye" onClick={openPreview} text="Preview" />

                    {selectedPlacement && slot !== null && gestureKind === null ? (
                      <div className="frame-toolbar-anchor" style={toolbarPosition(selectedPlacement)}>
                        <FrameToolbar
                          key={slot}
                          canReset={isFrameChanged}
                          hasImage={Boolean(doc.slotImages[slot])}
                          nudgeStep={nudgeSteps.large}
                          onDeleteImage={deleteImage}
                          onNudge={nudge}
                          onReplaceImage={replaceImage}
                          onExit={() => focusFrameTile(slot)}
                          onResetFrame={resetFrame}
                          slot={slot}
                        />
                      </div>
                    ) : null}
                  </div>
                </Flex.Item>
              </Flex>
            </Box>
          </main>

          {/* Right: frames and per-frame style */}
          <div className="workspace-right">
            <Box
              aria-label="Frames and style"
              as="aside"
              borderStyle="sm" height="100%" overflow="scrollY" padding={4}>
              <Flex direction="column" gap={3}>
                <Flex alignItems="center" justifyContent="between">
                  <div aria-level={2} role="heading">
                    <Text size="200" weight="bold">
                      Frames
                    </Text>
                  </div>
                  <Text color="subtle" size="200">
                    {isEmptyState ? `${cardCount} placeholders` : `${template.name} · ${cardCount}`}
                  </Text>
                </Flex>
                <FrameChips
                  count={cardCount}
                  imageForSlot={imageSrcForSlot}
                  onSelect={setSelectedSlot}
                  onSwap={swapImages}
                  selected={slot}
                  spareSlots={spareSlots}
                  edgeWarningSlots={edgeWarningSlots}
                  warningSlots={violatingSlots}
                />
                {selectedEdgeResult && selectedImage && selectedBackgroundFix ? (
                  <EdgeContrastNotice
                    backgroundFix={{
                      label: selectedBackgroundFix.label,
                      description: selectedBackgroundFix.description,
                      disabled: selectedBackgroundFix.id === null,
                      onApply: () => {
                        const id = selectedBackgroundFix.id
                        if (id) commit((current) => ({ ...current, colors: id }))
                      },
                    }}
                    onAddOutline={addOutlineToAllFrames}
                    onDismiss={() => edgeContrast.dismiss(selectedImage)}
                    weakSides={selectedEdgeResult.weakSides}
                  />
                ) : null}
                {slot !== null ? (
                  // Hidden until focused: lets keyboard users jump to the toolbar.
                  <div className="visually-hidden-focusable">
                    <Button
                      fullWidth
                      iconStart="arrow-forward"
                      onClick={focusFrameToolbar}
                      size="sm"
                      text={`Frame ${slot + 1} actions`}
                    />
                  </div>
                ) : null}
                <Button
                  disabled={!canResetAll}
                  fullWidth
                  iconStart="refresh"
                  onClick={resetAll}
                  size="sm"
                  text="Reset all"
                />
                <Divider />
                <StylePanel
                  borderMatchesAllFrames={borderMatchesAllFrames}
                  enabled={slot !== null}
                  onApplyBorderToAll={applyBorderToAllFrames}
                  expanded={styleExpanded}
                  onChange={updateStyle}
                  onExpandedChange={setStyleExpanded}
                  slot={activeSlot}
                  style={doc.styles[activeSlot]}
                />
                <Divider />
                <BackgroundStylePanel
                  expanded={backgroundStyleExpanded}
                  onChange={(update) =>
                    commit((current) => ({
                      ...current,
                      backgroundStyle: { ...current.backgroundStyle, ...update },
                    }))
                  }
                  onExpandedChange={setBackgroundStyleExpanded}
                  style={doc.backgroundStyle}
                />
              </Flex>
            </Box>
          </div>
        </div>
      </Box>

      {toast ? (
        <Layer>
          <div className="toast-anchor">
            <Toast
              dismissButton={{ accessibilityLabel: "Dismiss", onDismiss: () => setToast(null) }}
              text={toast}
              type="success"
            />
          </div>
        </Layer>
      ) : null}

      {previewUrl ? (
        <BlogPreview
          imageUrl={previewUrl}
          onDismiss={() => setPreviewUrl(null)}
          onTitleChange={setPreviewTitle}
          title={previewTitle}
        />
      ) : null}
    </DesignTokensProvider>
  )
}

export default App
