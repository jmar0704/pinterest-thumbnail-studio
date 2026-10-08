import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  TapArea,
  Text,
} from "gestalt"
import "gestalt/dist/gestalt.css"
import FrameChips from "@/components/FrameChips"
import StylePanel from "@/components/StylePanel"
import BlogPreview from "@/components/BlogPreview"
import ColorTemplatePicker from "@/components/ColorTemplatePicker"
import DropShadowSwitch from "@/components/DropShadowSwitch"
import TemplateSettings from "@/components/TemplateSettings"
import TemplatePicker from "@/components/TemplatePicker"
import useHistory from "@/hooks/useHistory"
import { canvas, findTemplate, maxCards, templates } from "@/data/templates"
import {
  defaultCardStyle,
  defaultScatter,
  isDefaultStyle,
  scatterSteps,
  type CardStyle,
} from "@/data/styleOptions"
import {
  clampOffset,
  computePlacements,
  hitTest,
  marginViolations,
  type Offset,
} from "@/lib/composition"
import { drawComposition } from "@/lib/drawComposition"
import { withViewTransition } from "@/lib/viewTransition"
import { colorTemplates, findColorTemplate, whiteColorTemplate } from "@/theme/artworkPalette"
import { iconSizes, sizes } from "@/theme/sizes"

type Doc = {
  templateId: string | null
  styles: CardStyle[]
  offsets: Offset[]
  /** Color template id: background + paired drop-shadow glow. */
  colors: string
  seed: number
  scatter: number
  /** One image per card slot; null shows the placeholder. Images never repeat. */
  slotImages: (string | null)[]
}

const zeroOffsets = (): Offset[] =>
  Array.from({ length: maxCards }, () => ({ x: 0, y: 0 }))
const defaultStyles = (): CardStyle[] =>
  Array.from({ length: maxCards }, () => ({ ...defaultCardStyle }))

const initialDoc: Doc = {
  templateId: null,
  styles: defaultStyles(),
  offsets: zeroOffsets(),
  colors: whiteColorTemplate.id,
  seed: 48213,
  scatter: defaultScatter,
  slotImages: Array.from({ length: maxCards }, () => null),
}

const maxFileBytes = 10 * 1024 * 1024
const placeholderImageSrc = "/assets/580dc.svg"
const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

function readToken(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function shuffled<T>(items: T[]) {
  if (new Set(items).size < 2) return items
  const order = [...items]
  do {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
  } while (order.every((value, index) => value === items[index]))
  return order
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

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    state: doc,
    commit,
    preview,
    settle,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Doc>(initialDoc, revokeUnused)
  /** The frame being edited, or null when none is selected. */
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState("")
  const [imagesLoaded, setImagesLoaded] = useState(0)
  /** Whether the selected template is open (its settings replace the grid). */
  const [templateOpen, setTemplateOpen] = useState(false)
  const [styleExpanded, setStyleExpanded] = useState(false)
  /** Snapshot of the design shown in the blog preview, or null when closed. */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")

  const template = findTemplate(doc.templateId)
  const isEmptyState = doc.templateId === null
  const cardCount = template.cards.length
  const slot = selectedSlot === null ? null : Math.min(selectedSlot, cardCount - 1)
  /** Slot to read values from while nothing is selected (controls are disabled then). */
  const activeSlot = slot ?? 0

  const announce = useCallback((message: string) => setStatus(message), [])
  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(""), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  const placements = useMemo(
    () =>
      computePlacements({
        template,
        styles: doc.styles,
        offsets: doc.offsets,
        // Scatter belongs to a template's settings; the Empty State sits as designed.
        scatter: isEmptyState ? 0 : doc.scatter,
        seed: doc.seed,
      }),
    [template, isEmptyState, doc.styles, doc.offsets, doc.scatter, doc.seed],
  )

  const violatingSlots = useMemo(() => {
    return new Set(
      placements
        .filter(
          (placement) =>
            marginViolations(placement, template.allowBleed).length,
        )
        .map((placement) => placement.slot),
    )
  }, [placements, template])

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
    return () =>
      elements.forEach((image) => image.removeEventListener("load", onLoad))
  }, [imageElements, placeholderImage])

  useEffect(() => {
    const element = canvasRef.current
    const context = element?.getContext("2d")
    if (!element || !context) return
    element.width = canvas.width
    element.height = canvas.height
    drawComposition(context, {
      colors: findColorTemplate(doc.colors),
      placements,
      imageForSlot: (cardSlot) => {
        const src = imageSrcForSlot(cardSlot)
        return src ? imageElements.get(src) : undefined
      },
      placeholder: placeholderImage,
      overlay: {
        selectedSlot: slot,
        violatingSlots,
        showMarginGuide: isDragging,
        colors: {
          selection: readToken("--color-border-focus"),
          warning: readToken("--color-icon-warning"),
          guide: readToken("--color-border-default"),
        },
      },
    })
  }, [
    doc.colors,
    placements,
    imageSrcForSlot,
    imageElements,
    placeholderImage,
    slot,
    violatingSlots,
    isDragging,
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

  // ---- Canvas dragging -----------------------------------------------------

  const dragRef = useRef<{
    slot: number
    pointerX: number
    pointerY: number
    origin: Offset
    start: Doc
    moved: boolean
  } | null>(null)

  const toCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
      scale: canvas.width / bounds.width,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(event)
    const hit = hitTest(placements, point.x, point.y)
    if (!hit) {
      setSelectedSlot(null)
      return
    }
    setSelectedSlot(hit.slot)
    dragRef.current = {
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
    const drag = dragRef.current
    if (!drag) return
    const { scale } = toCanvasPoint(event)
    const dx = (event.clientX - drag.pointerX) * scale
    const dy = (event.clientY - drag.pointerY) * scale
    if (!drag.moved && Math.hypot(dx, dy) < 3) return
    if (!drag.moved) {
      drag.moved = true
      setIsDragging(true)
    }
    const placement = placements.find((item) => item.slot === drag.slot)
    if (!placement) return
    const next = clampOffset(
      placement,
      { x: drag.origin.x + dx, y: drag.origin.y + dy },
      template.allowBleed,
    )
    preview((current) => ({
      ...current,
      offsets: current.offsets.map((offset, index) =>
        index === drag.slot ? next : offset,
      ),
    }))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (drag?.moved) settle(drag.start)
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  // ---- Actions ---------------------------------------------------------------

  const openTemplate = (id: string) =>
    withViewTransition(() => {
      setTemplateOpen(true)
      if (id === doc.templateId) return
      // Card slots don't correspond between templates, so start each one clean.
      commit((current) => ({
        ...current,
        templateId: id,
        offsets: zeroOffsets(),
        styles: defaultStyles(),
      }))
      setSelectedSlot(0)
    })

  const closeTemplate = () => withViewTransition(() => setTemplateOpen(false))

  const clearTemplate = () => {
    commit((current) => ({
      ...current,
      templateId: null,
      offsets: zeroOffsets(),
      styles: defaultStyles(),
    }))
    setSelectedSlot(null)
    setTemplateOpen(false)
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

  /** Every frame, style, Scatter and the background back to the template as designed. */
  const resetAll = () => {
    commit((current) => ({
      ...current,
      offsets: zeroOffsets(),
      styles: defaultStyles(),
      scatter: defaultScatter,
      colors: whiteColorTemplate.id,
    }))
    announce(`${template.name} is back to its original design`)
  }

  const isMoved = (offset: Offset) => offset.x !== 0 || offset.y !== 0
  const anyMoved = doc.offsets.slice(0, cardCount).some(isMoved)
  const isFrameChanged =
    slot !== null && (isMoved(doc.offsets[slot]) || !isDefaultStyle(doc.styles[slot]))
  const canResetAll =
    anyMoved ||
    doc.styles.slice(0, cardCount).some((style) => !isDefaultStyle(style)) ||
    doc.scatter !== defaultScatter ||
    doc.colors !== whiteColorTemplate.id

  const resetAllPositions = () => {
    commit((current) => ({ ...current, offsets: zeroOffsets() }))
    announce("All frames back in their template spots")
  }

  const canReorderImages = filledCount > 1
  const canShuffle = canReorderImages || (!isEmptyState && doc.scatter > 0)
  const shuffleHint = isEmptyState
    ? "Add 2 or more images to shuffle them"
    : "Add 2 or more images, or turn on Scatter, to shuffle"

  const shuffle = () =>
    commit((current) => ({
      ...current,
      seed: Math.floor(Math.random() * 90000) + 10000,
      // Swap images between this layout's frames; empty frames move too.
      slotImages: canReorderImages
        ? [
            ...shuffled(current.slotImages.slice(0, cardCount)),
            ...current.slotImages.slice(cardCount),
          ]
        : current.slotImages,
    }))

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

      const apply = () => {
        commit((current) => {
          const count = target ? target.cards.length : cardCount
          const slotImages = [...current.slotImages]
          // When switching to fit, pull spare images into view too.
          const incoming = target
            ? [
                ...slotImages.slice(count).filter((src): src is string => src !== null),
                ...urls,
              ]
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
        if (target) setTemplateOpen(true)
        setSelectedSlot(target ? 0 : (emptySlots[0] ?? 0))
      }
      if (target) withViewTransition(apply)
      else apply()

      const skipped = files.length - accepted.length
      announce(
        [
          `${urls.length} ${urls.length === 1 ? "image" : "images"} added`,
          target && target.id !== doc.templateId
            ? `switched to ${target.name} to fit ${total}`
            : "",
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

  const removeImage = () => {
    if (slot === null) return
    commit((current) => ({
      ...current,
      slotImages: current.slotImages.map((src, index) => (index === slot ? null : src)),
    }))
    announce(`Frame ${slot + 1} image removed`)
  }

  /** The thumbnail as exported: no guides, no selection outline. */
  const renderThumbnail = () => {
    const output = document.createElement("canvas")
    output.width = canvas.width
    output.height = canvas.height
    const context = output.getContext("2d")
    if (!context) return null
    drawComposition(context, {
      colors: findColorTemplate(doc.colors),
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
      link.download = `pinterest-thumbnail-${template.id}-${doc.seed}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      announce("PNG exported")
    }, "image/png")
  }

  const copyRecipe = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            format: "blog-header-16x9",
            template: doc.templateId,
            styles: doc.styles.slice(0, cardCount),
            offsets: doc.offsets.slice(0, cardCount),
            scatter: scatterSteps[doc.scatter].label,
            colors: doc.colors,
            seed: doc.seed,
          },
          null,
          2,
        ),
      )
      announce("Recipe copied")
    } catch {
      announce("Couldn't copy. Check clipboard permissions.")
    }
  }

  const undoShortcut = isMac ? "⌘Z" : "Ctrl+Z"
  const redoShortcut = isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"

  return (
    <DesignTokensProvider>
      <Box color="default" display="flex" direction="column" height="100vh">
        <Box as="header" borderStyle="sm" paddingX={5} paddingY={3}>
          <Flex alignItems="center" justifyContent="between">
            <Heading accessibilityLevel={1} size="400">
              Thumbnail Studio
            </Heading>
            <Flex alignItems="center" gap={2}>
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
                  iconStart="download"
                  onClick={exportImage}
                  size="md"
                  text="Export PNG"
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
            <Box as="aside" borderStyle="sm" height="100%" overflow="scrollY" padding={4}>
              <Flex direction="column" gap={5}>
                <Text size="200" weight="bold">
                  Blog header format: {canvas.width} × {canvas.height} pixels
                </Text>

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
                      <Text align="center" color="subtle" size="100">
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
                    slot={slot}
                    switched={doc.styles[activeSlot].dropShadow === 1}
                  />
                </Flex>

                <Divider />

                <Flex direction="column" gap={3}>
                  <Flex alignItems="center" justifyContent="between">
                    <Text size="200" weight="bold">
                      Templates
                    </Text>
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
                  {templateOpen && !isEmptyState ? (
                    <TemplateSettings
                      anyMoved={anyMoved}
                      canShuffle={canShuffle}
                      onBack={closeTemplate}
                      onCopyRecipe={copyRecipe}
                      onResetAllPositions={resetAllPositions}
                      onScatterChange={(index) =>
                        commit((current) => ({ ...current, scatter: index }))
                      }
                      onShuffle={shuffle}
                      scatter={doc.scatter}
                      shuffleHint={shuffleHint}
                      template={template}
                    />
                  ) : (
                    <>
                      <Text color="subtle" size="100">
                        {isEmptyState
                          ? "Pick a template to open its settings."
                          : `Select ${template.name} to open its settings again.`}
                      </Text>
                      <TemplatePicker
                        onSelect={openTemplate}
                        selectedId={doc.templateId}
                        templates={templates}
                      />
                    </>
                  )}
                </Flex>
              </Flex>
            </Box>
          </div>

          {/* Center: artboard and preview */}
          <div className="workspace-stage">
            <Box color="secondary" display="flex" height="100%" padding={6}>
              <Flex direction="column" flex="grow" gap={4} minWidth={0}>
                {violatingSlots.size > 0 ? (
                  <BannerSlim
                    iconAccessibilityLabel="Warning"
                    message={`${listFrames([...violatingSlots].sort((a, b) => a - b))} the ${canvas.margin}px margin. Drag back inside, or lower Size, Rotate, 3D tilt or Scatter.`}
                    type="warning"
                  />
                ) : null}

                <Flex.Item flex="grow" minWidth={0}>
                  <div className="artboard-frame">
                    <canvas
                      aria-label={`Preview of the ${template.name} thumbnail. Drag a frame to move it.`}
                      className="artboard artboard-draggable"
                      onPointerCancel={handlePointerUp}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      ref={canvasRef}
                      role="img"
                    />
                  </div>
                </Flex.Item>

                <Flex justifyContent="center">
                  <Button color="white" iconStart="eye" onClick={openPreview} text="Preview" />
                </Flex>
              </Flex>
            </Box>
          </div>

          {/* Right: frames and per-frame style */}
          <div className="workspace-right">
            <Box as="aside" borderStyle="sm" height="100%" overflow="scrollY" padding={4}>
              <Flex direction="column" gap={3}>
                <Flex alignItems="center" justifyContent="between">
                  <Text size="200" weight="bold">
                    Frames
                  </Text>
                  <Text color="subtle" size="100">
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
                  warningSlots={violatingSlots}
                />
                <Flex direction="column" gap={2}>
                  {slot !== null ? (
                    <Flex gap={2}>
                      <Flex.Item flex="grow">
                        <Button
                          fullWidth
                          iconStart={doc.slotImages[slot] ? "refresh" : "add"}
                          onClick={replaceImage}
                          size="sm"
                          text={`${doc.slotImages[slot] ? "Replace" : "Add"} image for frame ${slot + 1}`}
                        />
                      </Flex.Item>
                      {doc.slotImages[slot] ? (
                        <IconButton
                          accessibilityLabel={`Remove image from frame ${slot + 1}`}
                          icon="trash-can"
                          onClick={removeImage}
                          size="sm"
                          tooltip={{ text: "Remove image" }}
                        />
                      ) : null}
                    </Flex>
                  ) : null}
                  <Flex gap={2}>
                    <Flex.Item flex="grow">
                      <Button
                        disabled={!isFrameChanged}
                        fullWidth
                        iconStart="move-pin"
                        onClick={resetFrame}
                        size="sm"
                        text="Reset frame"
                      />
                    </Flex.Item>
                    <Flex.Item flex="grow">
                      <Button
                        disabled={!canResetAll}
                        fullWidth
                        iconStart="refresh"
                        onClick={resetAll}
                        size="sm"
                        text="Reset all"
                      />
                    </Flex.Item>
                  </Flex>
                </Flex>
                <Divider />
                <StylePanel
                  enabled={slot !== null}
                  expanded={styleExpanded}
                  onChange={updateStyle}
                  onExpandedChange={setStyleExpanded}
                  slot={activeSlot}
                  style={doc.styles[activeSlot]}
                />
              </Flex>
            </Box>
          </div>
        </div>
      </Box>

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
