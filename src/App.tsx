import { useEffect, useMemo, useRef, useState } from "react"
import {
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

type Structure = "grid" | "arc" | "stack" | "spread"
type FramePosition = {
  x: number
  y: number
}
type FrameStyle = {
  scale: number
  rotation: number
  offset: number
  tilt: number
  depth: number
  stroke: number
  shadow: number
  shadowColor: string
}

type FrameHit = {
  index: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

type TemplateCard = {
  x: number
  y: number
  rotation: number
}

const blogHeader = { label: "Blog header · 1600 × 900 · 16:9", width: 1600, height: 900 }
const templateCard = { width: 450, height: 650, radius: 48 }

const backgrounds = ["#fbfbf9", "#e5e5e0", "#ffffff", "#c7d9c4", "#211922"]
const shadowColors = ["#211922", "#6e5d51", "#a13c4c", "#486a55", "#526b8a"]
const initialFrameStyle: FrameStyle = {
  scale: 50,
  rotation: 0,
  offset: 0,
  tilt: 0,
  depth: 0,
  stroke: 0,
  shadow: 0,
  shadowColor: shadowColors[0],
}
const structureOptions: {
  value: Structure
  label: string
}[] = [
  { value: "grid", label: "Grid" },
  { value: "arc", label: "Arc" },
  { value: "stack", label: "Stack" },
  { value: "spread", label: "Spread" },
]
const emptyLayout: TemplateCard[] = [
  { x: 273, y: 450, rotation: 0 },
  { x: 800, y: 450, rotation: 0 },
  { x: 1327, y: 450, rotation: 0 },
]
const templateLayouts: Record<Structure, TemplateCard[]> = {
  arc: [
    { x: 1087.65, y: 763.68, rotation: 12 },
    { x: 512.65, y: 763.68, rotation: -12 },
    { x: 800, y: 593, rotation: 0 },
  ],
  stack: [
    { x: 850, y: 500, rotation: 0 },
    { x: 800, y: 450, rotation: 0 },
    { x: 750, y: 400, rotation: 0 },
  ],
  spread: [
    { x: 458.36, y: 657.98, rotation: -30 },
    { x: 646.31, y: 591.62, rotation: -18 },
    { x: 855.39, y: 575.42, rotation: -8 },
    { x: 996.18, y: 616.34, rotation: 2 },
    { x: 1192.44, y: 713.78, rotation: 16 },
  ],
  grid: [
    { x: 318, y: 33, rotation: 0 },
    { x: 318, y: 715, rotation: 0 },
    { x: 800, y: 828, rotation: 0 },
    { x: 800, y: 146, rotation: 0 },
    { x: 1282, y: 763, rotation: 0 },
    { x: 1282, y: 81, rotation: 0 },
  ],
}
const placeholderImageSrc = "/assets/580dc.svg"

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.closePath()
}

function SliderControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const updateValue = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    onChange(
      Math.round(
        Math.max(
          0,
          Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
        ),
      ),
    )
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <Flex direction="column" gap={1}>
      <Flex justifyContent="between" alignItems="center">
        <Text size="200" weight="bold">
          {label}
        </Text>
        <Text size="200" color="subtle">
          {value}
        </Text>
      </Flex>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="range-track"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp")
            onChange(Math.min(100, value + 5))
          if (event.key === "ArrowLeft" || event.key === "ArrowDown")
            onChange(Math.max(0, value - 5))
        }}
        onPointerDown={updateValue}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            updateValue(event)
        }}
        role="slider"
        tabIndex={0}
      >
        <Box
          color="dark"
          dangerouslySetInlineStyle={{ __style: { width: `${value}%` } }}
          height="100%"
          rounding="pill"
        />
        <Box
          color="dark"
          dangerouslySetInlineStyle={{
            __style: {
              left: `calc(${value}% - var(--space-200))`,
              top: "50%",
              transform: "translateY(-50%)",
            },
          }}
          height={16}
          position="absolute"
          rounding="circle"
          width={16}
        />
      </div>
    </Flex>
  )
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameHitsRef = useRef<FrameHit[]>([])
  const isExportingRef = useRef(false)
  const [structure, setStructure] = useState<Structure | null>(null)
  const frameCount = 3
  const [selectedFrame, setSelectedFrame] = useState(0)
  const [seed, setSeed] = useState(48213)
  const [background, setBackground] = useState(backgrounds[0])
  const [images, setImages] = useState<string[]>([])
  const [frameStyles, setFrameStyles] = useState<FrameStyle[]>(() =>
    Array.from({ length: 3 }, () => ({ ...initialFrameStyle })),
  )
  const [framePositions, setFramePositions] = useState<FramePosition[]>(() =>
    Array.from({ length: 3 }, () => ({ x: 0, y: 0 })),
  )
  const draggingFrameRef = useRef<{
    index: number
    startPointerX: number
    startPointerY: number
    originX: number
    originY: number
    hasMoved: boolean
  } | null>(null)

  const [status, setStatus] = useState("All changes saved")
  const selectedStyle = frameStyles[selectedFrame]

  const imageObjects = useMemo(
    () =>
      images.map((src) => {
        const image = new Image()
        image.src = src
        return image
      }),
    [images],
  )
  const placeholderImage = useMemo(() => {
    const image = new Image()
    image.src = placeholderImageSrc
    return image
  }, [])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    const { width, height } = blogHeader
    canvas.width = width
    canvas.height = height
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
    frameHitsRef.current = []

    const random = mulberry32(seed)
    const frameWidth = templateCard.width
    const frameHeight = templateCard.height
    const layout = structure ? templateLayouts[structure] : emptyLayout

    layout.forEach((templatePosition, cardIndex) => {
      const index = cardIndex % frameCount
      const image = imageObjects[index]
      const frameStyle = frameStyles[index]
      const customPos = framePositions[index] ?? { x: 0, y: 0 }
      const isEmptyLayout = structure === null
      let x = templatePosition.x
      let y = templatePosition.y
      const jitter = isEmptyLayout
        ? 0
        : (frameStyle.offset / 100) * frameWidth * 0.4
      x += (random() - 0.5) * jitter * 2 + customPos.x
      y += (random() - 0.5) * jitter * 2 + customPos.y
      const sizeMultiplier = isEmptyLayout
        ? 1
        : 0.4 + (frameStyle.scale / 100) * 1.2
      const depthMultiplier = isEmptyLayout
        ? 1
        : 0.9 + (random() - 0.5) * (frameStyle.depth / 100) * 0.38
      const scale = sizeMultiplier * depthMultiplier
      const rotation =
        templatePosition.rotation +
        (isEmptyLayout
          ? 0
          : (random() - 0.5) * (frameStyle.rotation / 100) * 24)
      const tiltX = isEmptyLayout
        ? 0
        : (random() - 0.5) * (frameStyle.tilt / 100) * 0.7
      const tiltY = isEmptyLayout
        ? 0
        : (random() - 0.5) * (frameStyle.tilt / 100) * 0.7
      const drawWidth = frameWidth * scale
      const drawHeight = frameHeight * scale
      const cornerRadius = templateCard.radius * scale
      frameHitsRef.current.push({
        index,
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        rotation: (rotation * Math.PI) / 180,
      })

      context.save()
      context.translate(x, y)
      context.rotate((rotation * Math.PI) / 180)
      context.transform(
        1,
        tiltY,
        tiltX,
        1 - Math.min(0.18, Math.abs(tiltY) * 0.3),
        0,
        0,
      )
      roundedRect(
        context,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
        cornerRadius,
      )
      context.fillStyle = image?.complete && image.naturalWidth ? "#f1f0eb" : "#fff7f7"
      context.shadowColor = frameStyle.shadowColor
      context.shadowBlur = frameStyle.shadow * 0.45
      context.shadowOffsetX = 0
      context.shadowOffsetY = frameStyle.shadow * 0.18
      context.fill()
      context.shadowColor = "transparent"
      context.shadowBlur = 0
      context.shadowOffsetY = 0
      context.save()
      roundedRect(
        context,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
        cornerRadius,
      )
      context.clip()

      if (image?.complete && image.naturalWidth) {
        const imageRatio = image.naturalWidth / image.naturalHeight
        const frameRatio = drawWidth / drawHeight
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
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
        )
      } else {
        if (placeholderImage.complete && placeholderImage.naturalWidth) {
          context.drawImage(
            placeholderImage,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight,
          )
        }
      }
      context.restore()

      if (frameStyle.stroke > 0) {
        context.strokeStyle = background === "#211922" ? "#ffffff" : "#211922"
        context.lineWidth = frameStyle.stroke * 0.22
        roundedRect(
          context,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
          cornerRadius,
        )
        context.stroke()
      }
      context.restore()
    })

  }

  useEffect(() => {
    imageObjects.forEach((image) => image.addEventListener("load", drawCanvas))
    placeholderImage.addEventListener("load", drawCanvas)
    drawCanvas()
    return () => {
      imageObjects.forEach((image) =>
        image.removeEventListener("load", drawCanvas),
      )
      placeholderImage.removeEventListener("load", drawCanvas)
    }
  })

  const markChanged = () => {
    setStatus("Saving…")
    window.setTimeout(() => setStatus("All changes saved"), 500)
  }

  const updateFrameStyle = (
    key: Exclude<keyof FrameStyle, "shadowColor">,
    value: number,
  ) => {
    setFrameStyles((current) =>
      current.map((style, index) =>
        index === selectedFrame ? { ...style, [key]: value } : style,
      ),
    )
    markChanged()
  }

  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const canvasX = ((event.clientX - bounds.left) / bounds.width) * canvas.width
    const canvasY =
      ((event.clientY - bounds.top) / bounds.height) * canvas.height

    const hit = [...frameHitsRef.current].reverse().find((frame) => {
      const deltaX = canvasX - frame.x
      const deltaY = canvasY - frame.y
      const localX =
        deltaX * Math.cos(-frame.rotation) -
        deltaY * Math.sin(-frame.rotation)
      const localY =
        deltaX * Math.sin(-frame.rotation) +
        deltaY * Math.cos(-frame.rotation)
      return (
        Math.abs(localX) <= frame.width / 2 &&
        Math.abs(localY) <= frame.height / 2
      )
    })

    if (hit) {
      setSelectedFrame(hit.index)
      setStatus(`Editing frame ${hit.index + 1}`)
      const currentPos = framePositions[hit.index] ?? { x: 0, y: 0 }
      draggingFrameRef.current = {
        index: hit.index,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        originX: currentPos.x,
        originY: currentPos.y,
        hasMoved: false,
      }
      canvas.setPointerCapture(event.pointerId)
    }
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const drag = draggingFrameRef.current
    if (!drag) return

    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const scaleFactor = canvas.width / bounds.width

    const deltaX = (event.clientX - drag.startPointerX) * scaleFactor
    const deltaY = (event.clientY - drag.startPointerY) * scaleFactor

    if (Math.hypot(deltaX, deltaY) > 3) {
      drag.hasMoved = true
    }

    setFramePositions((current) =>
      current.map((pos, idx) =>
        idx === drag.index
          ? { x: drag.originX + deltaX, y: drag.originY + deltaY }
          : pos,
      ),
    )
  }

  const handleCanvasPointerUp = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const drag = draggingFrameRef.current
    if (drag) {
      if (drag.hasMoved) {
        markChanged()
      }
      draggingFrameRef.current = null
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const chooseFiles = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/png,image/jpeg,image/webp"
    input.multiple = true
    input.onchange = () => {
      const files = Array.from(input.files ?? []).slice(0, 3)
      const valid = files.filter((file) => file.size <= 10 * 1024 * 1024)
      if (!valid.length) {
        setStatus("Choose images under 10 MB")
        return
      }
      setImages(valid.map((file) => URL.createObjectURL(file)))
      setSelectedFrame(0)
      setStatus(
        valid.length < files.length
          ? "Some large files were skipped"
          : `${valid.length} images added`,
      )
    }
    input.click()
  }

  const exportImage = () => {
    isExportingRef.current = true
    drawCanvas()
    const link = document.createElement("a")
    link.download = `pinterest-thumbnail-${seed}.png`
    link.href = canvasRef.current?.toDataURL("image/png") ?? ""
    link.click()
    isExportingRef.current = false
    drawCanvas()
    setStatus("PNG exported")
  }

  const copyRecipe = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          format: "blog-header-16x9",
          structure,
          frames: frameCount,
          frameStyles,
          framePositions,
          background,
          seed,
        },
        null,
        2,
      ),
    )
    setStatus("Recipe copied")
  }

  return (
    <DesignTokensProvider forceTheme="visualrefresh">
      <Box color="default" minHeight="100vh">
        <Box as="header" borderStyle="sm" paddingX={5} paddingY={3}>
          <Flex alignItems="center" justifyContent="between">
            <Flex alignItems="center" gap={3}>
              <Box
                alignItems="center"
                color="brand"
                display="flex"
                height={40}
                justifyContent="center"
                rounding="circle"
                width={40}
              >
                <Icon
                  accessibilityLabel=""
                  color="inverse"
                  icon="pinterest"
                  size={24}
                />
              </Box>
              <Box>
                <Heading accessibilityLevel={1} size="300">
                  Thumbnail Studio
                </Heading>
              </Box>
            </Flex>
            <Flex alignItems="center" gap={3}>
              <Text color="subtle" size="200">
                {status}
              </Text>
              <IconButton
                accessibilityLabel="Undo"
                bgColor="lightGray"
                icon="undo"
                iconColor="darkGray"
                size="md"
              />
              <Button
                color="red"
                iconStart="download"
                onClick={exportImage}
                size="md"
                text="Export PNG"
              />
            </Flex>
          </Flex>
        </Box>

        <Box display="flex" minHeight="calc(100vh - var(--space-1600))">
          <Box
            as="aside"
            borderStyle="sm"
            minWidth={360}
            padding={4}
            width={360}
          >
            <Flex direction="column" gap={5}>
              <Box>
                <Box marginBottom={3}>
                  <Text size="100" weight="bold">
                    FORMAT
                  </Text>
                </Box>
                <Box color="secondary" padding={3} rounding={3}>
                  <Flex alignItems="center" gap={2}>
                    <Icon
                      accessibilityLabel=""
                      color="default"
                      icon="orientation-landscape"
                      size={20}
                    />
                    <Box>
                      <Text size="200" weight="bold">
                        Blog Header
                      </Text>
                      <Text color="subtle" size="100">
                        1600 × 900 · 16:9
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Flex alignItems="center" justifyContent="between">
                  <Text size="100" weight="bold">
                    IMAGES
                  </Text>
                  <Text color="subtle" size="100">
                    {images.length}/3
                  </Text>
                </Flex>
                <Box marginTop={3}>
                  <TapArea
                    accessibilityLabel="Upload images"
                    onTap={chooseFiles}
                    rounding={4}
                    tapStyle="compress"
                  >
                    <Box borderStyle="sm" padding={4} rounding={4}>
                      <Flex alignItems="center" direction="column" gap={2}>
                        <Icon
                          accessibilityLabel=""
                          color="subtle"
                          icon="upload-feed"
                          size={22}
                        />
                        <Text align="center" size="200" weight="bold">
                          Add your images
                        </Text>
                        <Text align="center" color="subtle" size="100">
                          JPG, PNG or WebP · 10 MB max
                        </Text>
                      </Flex>
                    </Box>
                  </TapArea>
                </Box>
                <Box marginTop={3} overflow="hidden">
                  <Flex gap={2}>
                    {Array.from({ length: frameCount }).map((_, index) => (
                      <TapArea
                        accessibilityLabel={`Edit frame ${index + 1}`}
                        key={index}
                        onTap={() => setSelectedFrame(index)}
                        rounding={3}
                        tapStyle="compress"
                      >
                        <Box
                          alignItems="center"
                          borderStyle={selectedFrame === index ? "lg" : "sm"}
                          color="secondary"
                          display="flex"
                          height={44}
                          justifyContent="center"
                          overflow="hidden"
                          rounding={3}
                          width={44}
                        >
                          {images[index] ? (
                            <img
                              alt=""
                              className="image-chip"
                              src={images[index]}
                            />
                          ) : (
                            <Icon
                              accessibilityLabel=""
                              color="subtle"
                              icon="image-portrait"
                              size={18}
                            />
                          )}
                        </Box>
                      </TapArea>
                    ))}
                  </Flex>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Box marginBottom={3}>
                  <Text size="100" weight="bold">
                    TEMPLATES
                  </Text>
                </Box>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "var(--space-200, 8px)",
                  }}
                >
                  {structureOptions.map((option) => (
                    <TapArea
                      accessibilityLabel={`${option.label} template`}
                      key={option.value}
                      onTap={() => {
                        setStructure(option.value)
                        markChanged()
                      }}
                      rounding={3}
                      tapStyle="compress"
                    >
                      <Box
                        alignItems="center"
                        borderStyle={structure === option.value ? "lg" : "sm"}
                        color={structure === option.value ? "selected" : "secondary"}
                        display="flex"
                        height={64}
                        justifyContent="center"
                        padding={2}
                        rounding={3}
                      >
                        <Text
                          color={structure === option.value ? "inverse" : "default"}
                          size="200"
                          weight="bold"
                        >
                          {option.label}
                        </Text>
                      </Box>
                    </TapArea>
                  ))}
                </div>
              </Box>
            </Flex>
          </Box>

          <Box color="secondary" flex="grow" minWidth={0} padding={6}>
            <Flex direction="column" gap={4} height="100%">
              <Flex alignItems="center" justifyContent="between">
                <Box />
                <Flex alignItems="center" gap={2}>
                  <Button
                    color="gray"
                    iconStart="shuffles"
                    onClick={() => {
                      setSeed(Math.floor(Math.random() * 90000) + 10000)
                      markChanged()
                    }}
                    text="Shuffle"
                  />
                  <Button
                    color="selected"
                    onClick={() => {
                      setSelectedFrame((current) => (current + 1) % frameCount)
                    }}
                    text={`Frame ${selectedFrame + 1}`}
                  />
                </Flex>
                <Button
                  color="transparent"
                  iconStart="copy-to-clipboard"
                  onClick={copyRecipe}
                  text="Copy recipe"
                />
              </Flex>

              <Box
                alignItems="center"
                display="flex"
                flex="grow"
                justifyContent="center"
                minHeight={420}
              >
                <Box
                  maxHeight="100%"
                  maxWidth="100%"
                  overflow="hidden"
                  rounding={5}
                >
                  <canvas
                    aria-label={`Preview of ${structure ?? "empty"} thumbnail composition`}
                    className="artboard artboard-blog"
                    onPointerCancel={handleCanvasPointerUp}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    ref={canvasRef}
                    role="img"
                    style={{ touchAction: "none" }}
                  />
                </Box>
              </Box>

              <Box alignItems="center" display="flex" justifyContent="center">
                <Box
                  color="default"
                  maxWidth="100%"
                  padding={4}
                  rounding={5}
                  width="min(65vw, 960px)"
                >
                  <Flex alignItems="center" gap={3}>
                    <Text size="200" weight="bold">
                      Background
                    </Text>
                    <Flex gap={2}>
                      {backgrounds.map((color) => (
                        <TapArea
                          accessibilityLabel={`Use ${color} background`}
                          key={color}
                          onTap={() => {
                            setBackground(color)
                            markChanged()
                          }}
                          rounding="circle"
                        >
                          <Box
                            borderStyle={background === color ? "lg" : "sm"}
                            dangerouslySetInlineStyle={{
                              __style: { backgroundColor: color },
                            }}
                            height={32}
                            rounding="circle"
                            width={32}
                          />
                        </TapArea>
                      ))}
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            </Flex>
          </Box>

          <Box
            as="aside"
            borderStyle="sm"
            minWidth={300}
            padding={4}
            width={300}
          >
            <Box marginBottom={4}>
              <Flex alignItems="center" justifyContent="between">
                <Text size="100" weight="bold">
                  STYLE
                </Text>
                <Text color="subtle" size="100">
                  Frame {selectedFrame + 1}
                </Text>
              </Flex>
            </Box>
            <Flex direction="column" gap={4}>
              {(
                [
                  "scale",
                  "rotation",
                  "offset",
                  "tilt",
                  "depth",
                  "stroke",
                  "shadow",
                ] as const
              ).map((key) => (
                <SliderControl
                  key={key}
                  label={
                    key === "tilt"
                      ? "3D tilt"
                      : `${key[0].toUpperCase()}${key.slice(1)}`
                  }
                  onChange={(value) => updateFrameStyle(key, value)}
                  value={selectedStyle[key]}
                />
              ))}
              <Box>
                <Box marginBottom={2}>
                  <Text size="200" weight="bold">
                    Shadow color
                  </Text>
                </Box>
                <Flex gap={2}>
                  {shadowColors.map((color) => (
                    <TapArea
                      accessibilityLabel={`Use ${color} shadow`}
                      key={color}
                      onTap={() => {
                        setFrameStyles((current) =>
                          current.map((style, index) =>
                            index === selectedFrame
                              ? { ...style, shadowColor: color }
                              : style,
                          ),
                        )
                        markChanged()
                      }}
                      rounding="circle"
                    >
                      <Box
                        borderStyle={
                          selectedStyle.shadowColor === color ? "lg" : "sm"
                        }
                        dangerouslySetInlineStyle={{
                          __style: { backgroundColor: color },
                        }}
                        height={28}
                        rounding="circle"
                        width={28}
                      />
                    </TapArea>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Box>
        </Box>
      </Box>
    </DesignTokensProvider>
  )
}

export default App
