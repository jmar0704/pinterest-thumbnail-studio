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
import ColorTemplatePicker from "@/components/ColorTemplatePicker"
import TemplateSettings from "@/components/TemplateSettings"
import TemplatePicker from "@/components/TemplatePicker"
import useHistory from "@/hooks/useHistory"
import { canvas, findTemplate, maxCards, templates } from "@/data/templates"
import {
  defaultCardStyle,
  defaultScatter,
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
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState("")
  const [imagesLoaded, setImagesLoaded] = useState(0)
  /** Whether the selected template is open (its settings replace the grid). */
  const [templateOpen, setTemplateOpen] = useState(false)

  const template = findTemplate(doc.templateId)
  const isEmptyState = doc.templateId === null
  const cardCount = template.cards.length
  const slot = Math.min(selectedSlot, cardCount - 1)

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
        isEmptyState,
        styles: doc.styles,
        offsets: doc.offsets,
        scatter: doc.scatter,
        seed: doc.seed,
      }),
    [template, isEmptyState, doc.styles, doc.offsets, doc.scatter, doc.seed],
  )

  const violatingSlots = useMemo(() => {
    if (isEmptyState) return new Set<number>()
    return new Set(
      placements
        .filter(
          (placement) =>
            marginViolations(placement, template.allowBleed).length,
        )
        .map((placement) => placement.slot),
    )
  }, [placements, template, isEmptyState])

  const imageSrcForSlot = useCallback(
    (cardSlot: number) => doc.slotImages[cardSlot] ?? undefined,
    [doc.slotImages],
  )
  const layoutImages = doc.slotImages.slice(0, cardCount)
  const filledCount = layoutImages.filter(Boolean).length
  const emptySlots = layoutImages.flatMap((src, index) => (src ? [] : [index]))

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
        selectedSlot: isEmptyState ? null : slot,
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
    isEmptyState,
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
    if (!hit) return
    setSelectedSlot(hit.slot)
    // The Empty State is a fixed preview; cards move only within a template.
    if (isEmptyState) return
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
    setSelectedSlot(0)
    setTemplateOpen(false)
    announce("Back to the empty layout. Your images are kept.")
  }

  const updateStyle = (update: Partial<CardStyle>) =>
    commit((current) => ({
      ...current,
      styles: current.styles.map((style, index) =>
        index === slot ? { ...style, ...update } : style,
      ),
    }))

  const resetStyle = () => updateStyle({ ...defaultCardStyle })

  const resetPosition = () =>
    commit((current) => ({
      ...current,
      offsets: current.offsets.map((offset, index) =>
        index === slot ? { x: 0, y: 0 } : offset,
      ),
    }))

  const isMoved = (offset: Offset) => offset.x !== 0 || offset.y !== 0
  const anyMoved = doc.offsets.slice(0, cardCount).some(isMoved)

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

  /** Fill the layout's empty frames in order, one image per frame. */
  const addImages = () =>
    pickImages(true, (files) => {
      const targets = emptySlots.slice(0, files.length)
      const urls = files.slice(0, targets.length).map((file) => URL.createObjectURL(file))
      commit((current) => {
        const slotImages = [...current.slotImages]
        targets.forEach((target, index) => {
          slotImages[target] = urls[index]
        })
        return { ...current, slotImages }
      })
      setSelectedSlot(targets[0])
      const extra = files.length - targets.length
      announce(
        extra > 0
          ? `Added ${urls.length} of ${files.length}. ${template.name} has ${cardCount} frames.`
          : `${urls.length} ${urls.length === 1 ? "image" : "images"} added`,
      )
    })

  const replaceImage = () =>
    pickImages(false, ([file]) => {
      const url = URL.createObjectURL(file)
      commit((current) => ({
        ...current,
        slotImages: current.slotImages.map((src, index) => (index === slot ? url : src)),
      }))
      announce(`Frame ${slot + 1} image ${doc.slotImages[slot] ? "replaced" : "added"}`)
    })

  const removeImage = () => {
    commit((current) => ({
      ...current,
      slotImages: current.slotImages.map((src, index) => (index === slot ? null : src)),
    }))
    announce(`Frame ${slot + 1} image removed`)
  }

  const exportImage = () => {
    const output = document.createElement("canvas")
    output.width = canvas.width
    output.height = canvas.height
    const context = output.getContext("2d")
    if (!context) return
    drawComposition(context, {
      colors: findColorTemplate(doc.colors),
      placements,
      imageForSlot: (cardSlot) => {
        const src = imageSrcForSlot(cardSlot)
        return src ? imageElements.get(src) : undefined
      },
      placeholder: placeholderImage,
    })
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
          {/* Left: format, images, templates */}
          <div className="workspace-left">
            <Box
              as="aside"
              borderStyle="sm"
              height="100%"
              overflow="scrollY"
              padding={4}
            >
              <Flex direction="column" gap={5}>
                <Flex direction="column" gap={3}>
                  <Text size="100" weight="bold">
                    FORMAT: BLOG HEADER
                  </Text>
                  <Box color="secondary" padding={3} rounding={3}>
                    <Flex alignItems="center" gap={2}>
                      <Icon
                        accessibilityLabel=""
                        color="default"
                        icon="orientation-landscape"
                        size={iconSizes.md}
                      />
                      <Flex direction="column">
                        <Text size="200" weight="bold">
                          {canvas.width} × {canvas.height}
                        </Text>
                        <Text color="subtle" size="100">
                          16:9 landscape
                        </Text>
                      </Flex>
                    </Flex>
                  </Box>
                </Flex>

                <Divider />

                <Flex direction="column" gap={3}>
                  <Flex alignItems="center" justifyContent="between">
                    <Text size="100" weight="bold">
                      IMAGES
                    </Text>
                    <Text color="subtle" size="100">
                      {filledCount}/{cardCount} frames filled
                    </Text>
                  </Flex>
                  <TapArea
                    accessibilityLabel="Add images to empty frames"
                    disabled={emptySlots.length === 0}
                    onTap={addImages}
                    rounding={4}
                    tapStyle="compress"
                  >
                    <Box borderStyle="sm" padding={4} rounding={4}>
                      <Flex alignItems="center" direction="column" gap={2}>
                        <Icon
                          accessibilityLabel=""
                          color={emptySlots.length ? "subtle" : "disabled"}
                          icon="upload-feed"
                          size={iconSizes.lg}
                        />
                        <Text
                          align="center"
                          color={emptySlots.length ? "default" : "disabled"}
                          size="200"
                          weight="bold"
                        >
                          {emptySlots.length ? "Add images" : "Every frame has an image"}
                        </Text>
                        <Text align="center" color="subtle" size="100">
                          {emptySlots.length
                            ? `Fills the next ${emptySlots.length === 1 ? "empty frame" : `${emptySlots.length} empty frames`} · JPG, PNG or WebP · 10 MB max`
                            : "Select a frame to replace or remove its image"}
                        </Text>
                      </Flex>
                    </Box>
                  </TapArea>
                </Flex>

                <Divider />

                <Flex direction="column" gap={3}>
                  <Flex alignItems="center" justifyContent="between">
                    <Text size="100" weight="bold">
                      TEMPLATES
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
                      onBack={closeTemplate}
                      canShuffle={canShuffle}
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
                      <TemplatePicker
                        onSelect={openTemplate}
                        selectedId={doc.templateId}
                        templates={templates}
                      />
                      <Text color="subtle" size="100">
                        {isEmptyState
                          ? "Pick a template to open its settings."
                          : `Select ${template.name} to open its settings again.`}
                      </Text>
                    </>
                  )}
                </Flex>
              </Flex>
            </Box>
          </div>

          {/* Center: artboard and colors */}
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
                      className={
                        isEmptyState
                          ? "artboard"
                          : "artboard artboard-draggable"
                      }
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
                  <Box color="default" padding={4} rounding={5}>
                    <ColorTemplatePicker
                      onChange={(colors) => {
                        if (colors !== doc.colors)
                          commit((current) => ({ ...current, colors }))
                      }}
                      templates={colorTemplates}
                      value={doc.colors}
                    />
                  </Box>
                </Flex>
              </Flex>
            </Box>
          </div>

          {/* Right: frame picker and per-frame style */}
          <div className="workspace-right">
            <Box
              as="aside"
              borderStyle="sm"
              height="100%"
              overflow="scrollY"
              padding={4}
            >
              <Flex direction="column" gap={5}>
                <Flex direction="column" gap={3}>
                  <Flex alignItems="center" justifyContent="between">
                    <Text size="100" weight="bold">
                      FRAMES
                    </Text>
                    <Text color="subtle" size="100">
                      {isEmptyState
                        ? `${cardCount} placeholders`
                        : `${template.name} · ${cardCount}`}
                    </Text>
                  </Flex>
                  <FrameChips
                    count={cardCount}
                    imageForSlot={imageSrcForSlot}
                    onSelect={setSelectedSlot}
                    selected={slot}
                    warningSlots={violatingSlots}
                  />
                  <Flex gap={2} wrap>
                    <Button
                      iconStart={doc.slotImages[slot] ? "refresh" : "add"}
                      onClick={replaceImage}
                      size="sm"
                      text={`${doc.slotImages[slot] ? "Replace" : "Add"} image for frame ${slot + 1}`}
                    />
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
                </Flex>
                <Divider />
                <StylePanel
                  enabled={!isEmptyState}
                  isMoved={isMoved(doc.offsets[slot])}
                  onChange={updateStyle}
                  onResetPosition={resetPosition}
                  onResetStyle={resetStyle}
                  slot={slot}
                  style={doc.styles[slot]}
                />
              </Flex>
            </Box>
          </div>
        </div>
      </Box>
    </DesignTokensProvider>
  )
}

export default App
